import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, MessageSquare, ChevronLeft, Crown } from "lucide-react";
import type { Pod, User as UserType, PodMember } from "@shared/schema";

interface EnrichedConversation {
  id: number;
  podId: number;
  type: "direct" | "group";
  memberId: string | null;
  participant2Id: string | null;
  createdAt: string;
  pod: Pod | null;
  participant1Info: UserType | null;
  participant2Info: UserType | null;
  lastMessage: EnrichedMessage | null;
  unreadCount: number;
}

interface EnrichedMessage {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  senderName: string;
  senderAvatar: string | null;
}

interface MemberWithUser extends PodMember {
  userName: string;
  userEmail: string | null;
  user: UserType | null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function getUserName(user: UserType | null): string {
  if (!user) return "Unknown";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

// Returns the "other person" in a direct conversation from current user's perspective
function getOtherParticipant(conv: EnrichedConversation, currentUserId: string): UserType | null {
  if (conv.memberId === currentUserId) return conv.participant2Info;
  return conv.participant1Info;
}

function ConversationName({ conv, currentUserId }: { conv: EnrichedConversation; currentUserId: string }) {
  if (conv.type === "group") {
    return <span>{conv.pod?.title ?? "Group Chat"} — All Members</span>;
  }
  const other = getOtherParticipant(conv, currentUserId);
  return <span>{getUserName(other)}</span>;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const currentUser = user as any;
  const { toast } = useToast();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLeader = currentUser?.userType === "pod_leader";

  const { data: conversations = [], isLoading: convsLoading } = useQuery<EnrichedConversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<EnrichedMessage[]>({
    queryKey: ["/api/conversations", selectedConvId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: selectedConvId !== null,
    refetchInterval: 10000,
  });

  // SSE subscription for real-time message delivery
  useEffect(() => {
    if (!currentUser?.id) return;
    const es = new EventSource("/api/messages/stream");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          queryClient.refetchQueries({ queryKey: ["/api/conversations", data.conversationId, "messages"], type: "active" });
          queryClient.refetchQueries({ queryKey: ["/api/conversations"], type: "active" });
        }
      } catch {
        // ignore parse errors
      }
    };
    return () => es.close();
  }, [currentUser?.id]);

  // Leader's pod for creating conversations
  const { data: leaderPodData } = useQuery<Pod[]>({
    queryKey: ["/api/pods/leader", currentUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pods/leader/${currentUser?.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isLeader && !!currentUser?.id,
  });
  const leaderPod = leaderPodData?.[0];

  // For leaders: members of their pod
  const { data: leaderPodMembers } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/pods", leaderPod?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/pods/${leaderPod?.id}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isLeader && !!leaderPod?.id,
  });

  // For members: find what pod they belong to and who else is in it
  const { data: memberJoinRequests } = useQuery<any[]>({
    queryKey: ["/api/join-requests/user", currentUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/join-requests/user/${currentUser?.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isLeader && !!currentUser?.id,
  });

  // Get the accepted pod for a member
  const acceptedPodId = !isLeader && memberJoinRequests
    ? memberJoinRequests.find(r => r.status === "accepted")?.podId
    : null;

  const { data: memberPod } = useQuery<Pod>({
    queryKey: ["/api/pods", acceptedPodId],
    queryFn: async () => {
      const res = await fetch(`/api/pods/${acceptedPodId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !isLeader && !!acceptedPodId,
  });

  const { data: memberPodMembers } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/pods", acceptedPodId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/pods/${acceptedPodId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isLeader && !!acceptedPodId,
  });

  const activePodId = isLeader ? leaderPod?.id : acceptedPodId;
  const podForNewChat = isLeader ? leaderPod : memberPod;

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/conversations/${selectedConvId}/messages`, { content });
      return res.json();
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", selectedConvId, "messages"] });
      const previous = queryClient.getQueryData<EnrichedMessage[]>(["/api/conversations", selectedConvId, "messages"]);
      const optimistic: EnrichedMessage = {
        id: -Date.now(),
        conversationId: selectedConvId!,
        senderId: currentUser?.id ?? "",
        content,
        createdAt: new Date().toISOString(),
        readAt: null,
        senderName: `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() || "You",
        senderAvatar: currentUser?.profileImageUrl ?? null,
      };
      queryClient.setQueryData<EnrichedMessage[]>(
        ["/api/conversations", selectedConvId, "messages"],
        (old = []) => [...old, optimistic]
      );
      return { previous };
    },
    onError: (_err, _content, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/conversations", selectedConvId, "messages"], context.previous);
      }
      toast({ title: "Failed to send message", variant: "destructive" });
    },
    onSettled: () => {
      setMessageText("");
      queryClient.refetchQueries({ queryKey: ["/api/conversations", selectedConvId, "messages"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["/api/conversations"], type: "active" });
    },
  });

  const startGroupChat = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations/group", { podId: leaderPod!.id });
      return res.json();
    },
    onSuccess: async (conv) => {
      await queryClient.refetchQueries({ queryKey: ["/api/conversations"], type: "active" });
      setTimeout(() => {
        setSelectedConvId(conv.id);
        setShowMobileChat(true);
      }, 0);
    },
    onError: () => toast({ title: "Failed to start group chat", variant: "destructive" }),
  });

  const startDirectChat = useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await apiRequest("POST", "/api/conversations/direct", {
        podId: activePodId,
        recipientId,
      });
      return res.json();
    },
    onSuccess: async (conv) => {
      await queryClient.refetchQueries({ queryKey: ["/api/conversations"], type: "active" });
      setTimeout(() => {
        setSelectedConvId(conv.id);
        setShowMobileChat(true);
      }, 0);
    },
    onError: () => toast({ title: "Failed to start conversation", variant: "destructive" }),
  });


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConvId) return;
    sendMessage.mutate(messageText);
  };

  const handleSelectConv = (id: number) => {
    setSelectedConvId(id);
    setShowMobileChat(true);
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
  };

  // Build list of all contacts the user can message directly.
  // Always shows everyone — clicking opens existing conversation or creates new one.
  const contactOptions: { id: string; name: string; avatar: string | null; isLeader: boolean }[] = [];

  if (isLeader && leaderPodMembers) {
    leaderPodMembers.forEach(m => {
      const memberUser = m.user;
      if (!memberUser) return;
      contactOptions.push({
        id: memberUser.id,
        name: getUserName(memberUser),
        avatar: memberUser.profileImageUrl ?? null,
        isLeader: false,
      });
    });
  } else if (!isLeader && memberPodMembers && memberPod) {
    // Member sees pod leader first, then other members
    const leaderId = memberPod.leadId;
    const leaderInfo = memberPodMembers.find(m => m.userId === leaderId)?.user ?? null;
    contactOptions.push({
      id: leaderId,
      name: leaderInfo ? getUserName(leaderInfo) : "Pod Leader",
      avatar: leaderInfo?.profileImageUrl ?? null,
      isLeader: true,
    });
    memberPodMembers.forEach(m => {
      if (m.userId === currentUser?.id || m.userId === leaderId) return;
      const memberUser = m.user;
      if (!memberUser) return;
      contactOptions.push({
        id: memberUser.id,
        name: getUserName(memberUser),
        avatar: memberUser.profileImageUrl ?? null,
        isLeader: false,
      });
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navigation userType={currentUser?.userType} />

      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* Sidebar - Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${showMobileChat ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Messages
            </h1>
          </div>

          {/* Contacts + group chat */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
            {/* Group chat button (leaders only) */}
            {isLeader && leaderPod && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">Group</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/30"
                  onClick={() => startGroupChat.mutate()}
                  disabled={startGroupChat.isPending}
                >
                  <Users className="w-4 h-4" />
                  {startGroupChat.isPending ? "Starting..." : "Message All Members"}
                </Button>
              </>
            )}

            {/* Contact list */}
            {contactOptions.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 pt-1">
                  {isLeader ? "Members" : "Contacts"}
                </p>
                <div className="space-y-0.5">
                  {contactOptions.map(person => (
                    <Button
                      key={person.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 h-9"
                      onClick={() => startDirectChat.mutate(person.id)}
                      disabled={startDirectChat.isPending}
                    >
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        {person.avatar && <AvatarImage src={person.avatar} />}
                        <AvatarFallback className="text-[9px] bg-purple-100 text-purple-700">{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs flex-1 text-left">{person.name}</span>
                      {person.isLeader && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* No pod/members state */}
            {!isLeader && activePodId === null && !memberJoinRequests?.length && (
              <p className="text-xs text-gray-400 px-1 py-2">
                You need to be an active pod member to send messages.
              </p>
            )}
            {isLeader && !leaderPod && (
              <p className="text-xs text-gray-400 px-1 py-2">
                Create a pod to start messaging members.
              </p>
            )}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No messages yet. Start a new conversation above.
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const other = getOtherParticipant(conv, currentUser?.id);
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors ${selectedConvId === conv.id ? "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-500" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      {conv.type === "group" ? (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <Avatar className="w-10 h-10">
                          {other?.profileImageUrl && <AvatarImage src={other.profileImageUrl} />}
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                            {getInitials(getUserName(other))}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? "text-gray-900 dark:text-white font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
                          <ConversationName conv={conv} currentUserId={currentUser?.id} />
                        </span>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {conv.type === "group" && <span className="text-purple-400 font-medium">Group · </span>}
                        {conv.lastMessage ? conv.lastMessage.content : "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 ${!showMobileChat ? "hidden md:flex" : "flex"}`}>
          {selectedConvId !== null ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                {selectedConv ? (
                  selectedConv.type === "group" ? (
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                  ) : (() => {
                    const other = getOtherParticipant(selectedConv, currentUser?.id);
                    return (
                      <Avatar className="w-9 h-9">
                        {other?.profileImageUrl && <AvatarImage src={other.profileImageUrl} />}
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                          {getInitials(getUserName(other))}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })()
                ) : (
                  <Skeleton className="w-9 h-9 rounded-full" />
                )}
                <div className="flex-1 min-w-0">
                  {selectedConv ? (
                    <>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        <ConversationName conv={selectedConv} currentUserId={currentUser?.id} />
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedConv.pod?.clubName}
                        {selectedConv.type === "group" && " · Group chat"}
                      </p>
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </>
                  )}
                </div>
                {selectedConv?.type === "group" && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Group
                  </Badge>
                )}
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {msgsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMe && (
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            {msg.senderAvatar && <AvatarImage src={msg.senderAvatar} />}
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                              {getInitials(msg.senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          {!isMe && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 px-1">{msg.senderName}</span>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm"}`}>
                            {msg.content}
                          </div>
                          <span className="text-xs text-gray-400 px-1">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full bg-gray-100 dark:bg-gray-700 border-0 focus-visible:ring-1 focus-visible:ring-purple-400"
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || sendMessage.isPending}
                    className="rounded-full w-10 h-10 p-0 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Messages</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                Select a conversation or start a new one using the panel on the left.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
