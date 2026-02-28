import OpenAI from "openai";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentContext {
  userId: string;
  userType: string | null;
  userName: string;
}

export interface RichContent {
  type: "pods" | "requests" | "members" | "pod";
  data: unknown;
}

export interface AgentResponse {
  reply: string;
  richContent?: RichContent;
  navigateTo?: string;
}

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_pods",
      description:
        "Browse or search available pods with optional filters. Use when user wants to find, browse, or see pods.",
      parameters: {
        type: "object",
        properties: {
          region: {
            type: "string",
            description:
              "Bay Area region, e.g. 'San Francisco', 'East Bay', 'Peninsula', 'South Bay', 'Marin', 'North Bay'",
          },
          city: { type: "string", description: "Specific city name" },
          maxBudget: {
            type: "number",
            description: "Maximum monthly cost per person in dollars",
          },
          membershipType: {
            type: "string",
            description:
              "Membership type: 'Single-Club', 'Multi-Club', or 'Family'",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pod_details",
      description: "Get detailed information about a specific pod by its ID.",
      parameters: {
        type: "object",
        properties: {
          podId: { type: "number", description: "The numeric pod ID" },
        },
        required: ["podId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_join_requests",
      description:
        "Get the current user's join requests and their status. For pod seekers to check application status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_join_requests",
      description:
        "Get pending join requests for the leader's pod. Only works for pod leaders.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_pod_info",
      description:
        "Get information about the current user's pod. For leaders, returns their pod details. For seekers, returns the pod they're a member of (if any).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_members",
      description:
        "Get current active members of the leader's pod. Only for pod leaders.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_join_request",
      description:
        "Approve a join request for the leader's pod. Only for pod leaders. Requires confirmation from the user before calling.",
      parameters: {
        type: "object",
        properties: {
          requestId: {
            type: "number",
            description: "The join request ID to approve",
          },
        },
        required: ["requestId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "decline_join_request",
      description:
        "Decline a join request for the leader's pod. Only for pod leaders. Requires confirmation from the user before calling.",
      parameters: {
        type: "object",
        properties: {
          requestId: {
            type: "number",
            description: "The join request ID to decline",
          },
          reason: {
            type: "string",
            description: "Optional reason for declining",
          },
        },
        required: ["requestId"],
      },
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentContext
): Promise<{ result: string; richContent?: RichContent }> {
  try {
    switch (name) {
      case "search_pods": {
        const allPods = await storage.getPods();
        let filtered = allPods.filter((p) => !p.deletedAt && p.availableSpots > 0);
        const region = args.region as string | undefined;
        const city = args.city as string | undefined;
        const maxBudget = args.maxBudget as number | undefined;
        const membershipType = args.membershipType as string | undefined;

        if (region)
          filtered = filtered.filter((p) =>
            p.clubRegion?.toLowerCase().includes(region.toLowerCase())
          );
        if (city)
          filtered = filtered.filter((p) =>
            p.city?.toLowerCase().includes(city.toLowerCase())
          );
        if (maxBudget)
          filtered = filtered.filter(
            (p) => Number(p.costPerPerson) <= maxBudget
          );
        if (membershipType)
          filtered = filtered.filter((p) => p.membershipType === membershipType);

        const pods = filtered.slice(0, 8);
        if (pods.length === 0)
          return { result: "No pods found matching those criteria." };

        const summary = pods
          .map(
            (p) =>
              `- "${p.title}" in ${p.city || p.clubRegion}, $${p.costPerPerson}/mo, ${p.availableSpots} spot(s) left, ${p.membershipType} (ID: ${p.id})`
          )
          .join("\n");
        return {
          result: `Found ${pods.length} pod(s):\n${summary}`,
          richContent: { type: "pods", data: pods },
        };
      }

      case "get_pod_details": {
        const podId = args.podId as number;
        const pod = await storage.getPod(podId);
        if (!pod) return { result: `Pod with ID ${podId} not found.` };
        return {
          result: JSON.stringify({
            id: pod.id,
            title: pod.title,
            club: pod.clubName,
            region: pod.clubRegion,
            city: pod.city,
            cost: `$${pod.costPerPerson}/month`,
            availableSpots: pod.availableSpots,
            membershipType: pod.membershipType,
            amenities: pod.amenities,
            description: pod.description,
          }),
          richContent: { type: "pod", data: pod },
        };
      }

      case "get_my_join_requests": {
        const requests = await storage.getJoinRequestsForUser(context.userId);
        if (requests.length === 0)
          return {
            result:
              "You have no join requests. Browse pods to find one you'd like to join!",
          };
        const enriched = await Promise.all(
          requests.map(async (r) => {
            const pod = await storage.getPod(r.podId);
            return { ...r, podTitle: pod?.title || "Unknown pod" };
          })
        );
        const summary = enriched
          .map(
            (r) =>
              `- "${r.podTitle}": ${r.status} (Request ID: ${r.id})`
          )
          .join("\n");
        return {
          result: `Your join requests:\n${summary}`,
          richContent: { type: "requests", data: enriched },
        };
      }

      case "get_pending_join_requests": {
        if (context.userType !== "pod_leader")
          return { result: "Only pod leaders can view pending join requests." };
        const pods = await storage.getPodsByLeaderId(context.userId);
        if (pods.length === 0)
          return {
            result:
              "You don't have a pod yet. Create one from your dashboard!",
          };
        const pod = pods[0];
        const requests = await storage.getJoinRequestsForPod(pod.id);
        const pending = requests.filter((r) => r.status === "pending");
        if (pending.length === 0)
          return {
            result: `No pending join requests for "${pod.title}" right now.`,
          };
        const summary = pending
          .map(
            (r) =>
              `- ${r.userInfo?.name || "Unknown"} (${r.userInfo?.email || "no email"}): "${(r.message || "no message").slice(0, 60)}..." (Request ID: ${r.id})`
          )
          .join("\n");
        return {
          result: `${pending.length} pending request(s) for "${pod.title}":\n${summary}`,
          richContent: { type: "requests", data: pending },
        };
      }

      case "get_my_pod_info": {
        if (context.userType === "pod_leader") {
          const pods = await storage.getPodsByLeaderId(context.userId);
          if (pods.length === 0)
            return {
              result:
                "You don't have a pod yet. Go to your dashboard to create one.",
            };
          const pod = pods[0];
          return {
            result: JSON.stringify({
              id: pod.id,
              title: pod.title,
              club: pod.clubName,
              region: pod.clubRegion,
              cost: `$${pod.costPerPerson}/month`,
              availableSpots: pod.availableSpots,
              membershipType: pod.membershipType,
            }),
            richContent: { type: "pod", data: pod },
          };
        } else {
          const members = await storage.getPodMembers(0);
          const allPods = await storage.getPods();
          const myActiveMembership = await (async () => {
            for (const pod of allPods) {
              const mems = await storage.getPodMembers(pod.id);
              const mine = mems.find(
                (m) => m.userId === context.userId && m.isActive
              );
              if (mine) return { pod, member: mine };
            }
            return null;
          })();
          if (!myActiveMembership)
            return {
              result:
                "You're not currently an active member of any pod. Browse pods to join one!",
            };
          const pod = myActiveMembership.pod;
          return {
            result: `You're a member of "${pod.title}" at ${pod.clubName} ($${pod.costPerPerson}/month).`,
            richContent: { type: "pod", data: pod },
          };
        }
      }

      case "get_my_members": {
        if (context.userType !== "pod_leader")
          return { result: "Only pod leaders can view their pod members." };
        const pods = await storage.getPodsByLeaderId(context.userId);
        if (pods.length === 0)
          return { result: "You don't have a pod yet." };
        const pod = pods[0];
        const members = await storage.getPodMembers(pod.id);
        const active = members.filter((m) => m.isActive);
        if (active.length === 0)
          return {
            result: `"${pod.title}" has no active members yet. Pending requests can be found with get_pending_join_requests.`,
          };
        const memberDetails = await Promise.all(
          active.map(async (m) => {
            const user = await storage.getUser(m.userId);
            return `- ${user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown"} (joined ${new Date(m.joinedAt!).toLocaleDateString()})`;
          })
        );
        return {
          result: `Active members of "${pod.title}" (${active.length}):\n${memberDetails.join("\n")}`,
          richContent: { type: "members", data: active },
        };
      }

      case "approve_join_request": {
        if (context.userType !== "pod_leader")
          return { result: "Only pod leaders can approve join requests." };
        const requestId = args.requestId as number;
        const req = await storage.getJoinRequest(requestId);
        if (!req)
          return { result: `Join request #${requestId} not found.` };
        const pods = await storage.getPodsByLeaderId(context.userId);
        if (!pods.length || pods[0].id !== req.podId)
          return {
            result: "You can only approve requests for your own pod.",
          };
        await storage.updateJoinRequestStatus(requestId, "accepted");
        return {
          result: `Done! ${req.userInfo?.name || "The applicant"}'s request to join has been approved. They're now a member of your pod.`,
        };
      }

      case "decline_join_request": {
        if (context.userType !== "pod_leader")
          return { result: "Only pod leaders can decline join requests." };
        const requestId = args.requestId as number;
        const req = await storage.getJoinRequest(requestId);
        if (!req)
          return { result: `Join request #${requestId} not found.` };
        const pods = await storage.getPodsByLeaderId(context.userId);
        if (!pods.length || pods[0].id !== req.podId)
          return {
            result: "You can only decline requests for your own pod.",
          };
        await storage.updateJoinRequestStatus(requestId, "rejected");
        return {
          result: `Request declined. ${req.userInfo?.name || "The applicant"}'s join request has been rejected.`,
        };
      }

      default:
        return { result: "Unknown tool." };
    }
  } catch (err) {
    console.error(`[PodAgent] Tool ${name} error:`, err);
    return { result: "An error occurred while fetching that information." };
  }
}

export async function processAgentMessage(
  messages: AgentChatMessage[],
  context: AgentContext
): Promise<AgentResponse> {
  const systemPrompt = `You are PodAgent, FlexPod's friendly AI assistant. FlexPod is a platform where Bay Club gym members share membership pods to split costs.

Current user:
- Name: ${context.userName}
- Role: ${context.userType === "pod_leader" ? "Pod Leader (manages a shared membership pod)" : context.userType === "pod_seeker" ? "Pod Seeker (looking to join a pod)" : "New user"}

Your capabilities:
${context.userType === "pod_leader" ? `As a pod leader, you can:
- View pending join requests for their pod
- Approve or decline join requests (always confirm with the user before approving or declining)
- View their pod members
- Show details about their pod
- Browse other available pods` : `As a pod seeker, you can:
- Browse and search available pods
- Get detailed info about specific pods
- Check the status of their join requests
- Show pod details`}
- Answer questions about how FlexPod works

Guidelines:
- Be friendly, concise, and proactive. Suggest next steps.
- When showing pods, highlight key info (location, price, spots available).
- Before approving or declining a request, always ask the user to confirm.
- For actions that navigate somewhere, mention you can guide them there.
- Keep responses focused and not too long. Use bullet points when listing things.
- If you don't know something, say so honestly.`;

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let lastRichContent: RichContent | undefined;

  for (let i = 0; i < 5; i++) {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: openaiMessages,
      tools,
      tool_choice: "auto",
      max_completion_tokens: 800,
    });

    const choice = response.choices[0];
    const msg = choice.message;
    openaiMessages.push(msg);

    if (choice.finish_reason === "tool_calls" && msg.tool_calls) {
      for (const call of msg.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        const { result, richContent } = await executeTool(
          call.function.name,
          args,
          context
        );
        if (richContent) lastRichContent = richContent;
        openaiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
      continue;
    }

    return {
      reply: msg.content || "I'm not sure how to help with that.",
      richContent: lastRichContent,
    };
  }

  return {
    reply: "I hit a limit processing your request. Please try again.",
  };
}
