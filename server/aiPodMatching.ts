import OpenAI from "openai";
import type { Pod, User } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface PodMatchPreferences {
  region?: string;
  city?: string;
  zipCode?: string;
  maxBudget?: number;
  membershipType?: string;
  amenities?: string[];
  notes?: string;
}

export interface PodMatch {
  podId: number;
  score: number;
  explanation: string;
}

export interface PodMatchResult {
  matches: (Pod & { explanation: string; score: number })[];
}

export async function findMatchingPods(
  preferences: PodMatchPreferences,
  pods: Pod[]
): Promise<PodMatchResult> {
  if (pods.length === 0) return { matches: [] };

  const podSummaries = pods.map(pod => ({
    id: pod.id,
    title: pod.title,
    clubName: pod.clubName,
    clubRegion: pod.clubRegion,
    city: pod.city,
    zipCode: pod.zipCode,
    membershipType: pod.membershipType,
    costPerPerson: pod.costPerPerson,
    availableSpots: pod.availableSpots,
    amenities: pod.amenities,
    description: pod.description?.slice(0, 200),
  }));

  const prompt = `You are a gym pod matching assistant for FlexPod, a platform where people share Bay Club gym memberships.

A pod seeker has the following preferences:
${preferences.region ? `- Preferred region: ${preferences.region}` : ""}
${preferences.city ? `- City: ${preferences.city}` : ""}
${preferences.zipCode ? `- ZIP code: ${preferences.zipCode}` : ""}
${preferences.maxBudget ? `- Maximum monthly budget: $${preferences.maxBudget}` : ""}
${preferences.membershipType ? `- Preferred membership type: ${preferences.membershipType}` : ""}
${preferences.amenities?.length ? `- Desired amenities: ${preferences.amenities.join(", ")}` : ""}
${preferences.notes ? `- Additional notes: ${preferences.notes}` : ""}

Available pods:
${JSON.stringify(podSummaries, null, 2)}

Analyze each pod and return the top matches (up to 5) that best fit the seeker's preferences. For each match:
1. Give a score from 0-100 (higher = better match)
2. Write a 1-2 sentence explanation of why it's a good match, being specific about what matches their preferences

Respond with valid JSON in this exact format:
{
  "matches": [
    { "podId": <number>, "score": <number>, "explanation": "<string>" }
  ]
}

Only include pods with a score above 30. Sort by score descending.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed: { matches: PodMatch[] } = JSON.parse(content);

  // Map back to full pod objects with explanation
  const podMap = new Map(pods.map(p => [p.id, p]));
  const results = (parsed.matches ?? [])
    .filter(m => podMap.has(m.podId))
    .slice(0, 5)
    .map(m => ({
      ...podMap.get(m.podId)!,
      explanation: m.explanation,
      score: m.score,
    }));

  return { matches: results };
}

export async function generateJoinMessage(
  user: Partial<User>,
  pod: Pod
): Promise<string> {
  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "the applicant";

  const prompt = `You are helping a Bay Club gym member write a short, friendly introduction message to send to a pod leader when requesting to join their shared membership pod.

Pod details:
- Pod name: ${pod.title}
- Club: ${pod.clubName} (${pod.clubRegion})
- Membership type: ${pod.membershipType}
- Amenities: ${(pod.amenities ?? []).join(", ") || "Not specified"}
- Description: ${pod.description?.slice(0, 200) ?? ""}

Applicant profile:
- Name: ${userName}
- Membership level: ${user.membershipLevel || "Bay Club member"}
- Preferred region: ${user.preferredRegion || pod.clubRegion}
- Primary club: ${user.primaryClub || pod.clubName}

Write a short, warm, and personalized 2–3 sentence message from ${userName} to the pod leader. The message should:
1. Introduce themselves briefly
2. Mention something specific about why this pod is a good fit for them
3. Express genuine interest in joining
4. Sound natural and conversational — not robotic or overly formal

Reply with ONLY the message text, no quotes, no labels, no explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 200,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
