import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  X,
  Send,
  Loader2,
  MapPin,
  DollarSign,
  Users,
  ArrowRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Pod, JoinRequest } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  richContent?: RichContent;
}

interface RichContent {
  type: "pods" | "requests" | "members" | "pod";
  data: unknown;
}

interface AgentResponse {
  reply: string;
  richContent?: RichContent;
}

const STARTER_PROMPTS_SEEKER = [
  "Find pods in San Francisco",
  "What pods are under $200/month?",
  "Check my join request status",
];

const STARTER_PROMPTS_LEADER = [
  "Show my pending join requests",
  "Who are my current members?",
  "Tell me about my pod",
];

function PodCard({ pod, onView }: { pod: Pod; onView: (id: number) => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{pod.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {pod.city || pod.clubRegion}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${pod.costPerPerson}/mo
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {pod.availableSpots} spot{pod.availableSpots !== 1 ? "s" : ""} left
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0 border-purple-200 text-purple-600">
          {pod.membershipType}
        </Badge>
      </div>
      <Button
        size="sm"
        className="w-full h-7 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        onClick={() => onView(pod.id)}
      >
        View Pod <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

function RequestCard({ request }: { request: JoinRequest & { podTitle?: string } }) {
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    accepted: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const color = statusColor[request.status] ?? statusColor.pending;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {(request as any).userInfo?.name || (request as any).podTitle || `Request #${request.id}`}
          </p>
          {(request as any).podTitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{(request as any).podTitle}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
          {request.status}
        </span>
      </div>
      {request.message && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 italic">
          "{request.message}"
        </p>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  onNavigate,
}: {
  msg: ChatMessage;
  onNavigate: (path: string) => void;
}) {
  const isUser = msg.role === "user";
  const pods =
    msg.richContent?.type === "pods"
      ? (msg.richContent.data as Pod[])
      : msg.richContent?.type === "pod"
      ? [msg.richContent.data as Pod]
      : [];
  const requests =
    msg.richContent?.type === "requests"
      ? (msg.richContent.data as (JoinRequest & { podTitle?: string })[])
      : [];

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm"
        }`}
      >
        {msg.content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < msg.content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>

      {pods.length > 0 && (
        <div className="w-full space-y-2 mt-1">
          {pods.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              onView={(id) => onNavigate(`/pods/${id}`)}
            />
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <div className="w-full space-y-2 mt-1">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-1">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

interface PodAgentProps {
  userType?: string | null;
}

export default function PodAgent({ userType }: PodAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const starters =
    userType === "pod_leader" ? STARTER_PROMPTS_LEADER : STARTER_PROMPTS_SEEKER;

  const chatMutation = useMutation({
    mutationFn: async (userMessages: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/agent/chat", {
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      return res.json() as Promise<AgentResponse>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          richContent: data.richContent,
        },
      ]);
    },
    onError: () => {
      toast({
        title: "PodAgent unavailable",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I ran into an issue. Please try again!",
        },
      ]);
    },
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;

    const newUserMsg: ChatMessage = { role: "user", content: trimmed };
    const updated = [...messages, newUserMsg];
    setMessages(updated);
    setInput("");
    chatMutation.mutate(updated);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      const greeting =
        userType === "pod_leader"
          ? "Hi! I'm PodAgent. I can help you manage your pod — review join requests, check members, and more. What would you like to do?"
          : "Hi! I'm PodAgent. I can help you find the perfect pod, check your applications, and answer questions about FlexPod. What are you looking for?";
      setMessages([{ role: "assistant", content: greeting }]);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {isOpen && (
          <div className="w-[340px] sm:w-[380px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
            style={{ maxHeight: "calc(100vh - 100px)", height: "560px" }}>
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">PodAgent</p>
                <p className="text-xs text-white/70">Your FlexPod AI assistant</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onNavigate={handleNavigate} />
              ))}
              {chatMutation.isPending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 && !chatMutation.isPending && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask PodAgent anything..."
                  className="flex-1 h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700"
                  disabled={chatMutation.isPending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="h-9 w-9 p-0 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shrink-0"
                >
                  {chatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        <button
          onClick={isOpen ? () => setIsOpen(false) : handleOpen}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label="Open PodAgent"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    </>
  );
}
