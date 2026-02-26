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
import { Send, Users, User, MessageSquare, Plus, ChevronLeft } from "lucide-react";
import type { Pod, User as UserType } from "@shared/schema";

interface EnrichedConversation {
  id: number;
  podId: number;
  type: "direct" | "group";
  memberId: string | null;
  createdAt: string;
  pod: Pod | null;
  memberInfo: UserType | null;
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
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function ConversationName({ conv, currentUserId }: { conv: EnrichedConversation; currentUserId: string }) {
  if (conv.type === "group") {
    return <span>{conv.pod?.title ?? "Group Chat"} — All Members</span>;
  }
  if (conv.memberInfo) {
    const name = `${conv.memberInfo.firstName ?? ""} ${conv.memberInfo.lastName ?? ""}`.trim();
    return <span>{name || conv.memberInfo.email}</span>;
  }
  return <span>Direct Message</span>;
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
    enabled: selectedConvId !== null,
    refetchInterval: 3000,
  });

  // Leader's pod for creating conversations
  const { data: leaderPodData } = useQuery<Pod[]>({
    queryKey: ["/api/pods/leader", currentUser?.id],
    enabled: isLeader && !!currentUser?.id,
  });
  const leaderPod = leaderPodData?.[0];

  // Members of leader's pod
  const { data: podMembersData } = useQuery<any[]>({
    queryKey: ["/api/pods", leaderPod?.id, "members"],
    enabled: isLeader && !!leaderPod?.id,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/conversations/${selectedConvId}/messages`, { content });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConvId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const startGroupChat = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations/group", { podId: leaderPod!.id });
      return res.json();
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConvId(conv.id);
      setShowMobileChat(true);
    },
    onError: () => toast({ title: "Failed to start group chat", variant: "destructive" }),
  });

  const startDirectChat = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await apiRequest("POST", "/api/conversations/direct", { podId: leaderPod!.id, memberId });
      return res.json();
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConvId(conv.id);
      setShowMobileChat(true);
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

          {/* New conversation buttons (leader only) */}
          {isLeader && leaderPod && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">Start New Chat</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={() => startGroupChat.mutate()}
                disabled={startGroupChat.isPending}
              >
                <Users className="w-4 h-4" />
                Message All Members
              </Button>
              {podMembersData && podMembersData.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Direct messages:</p>
                  {podMembersData.map((member: any) => {
                    const memberUser = member.user || member;
                    const name = `${memberUser.firstName ?? ""} ${memberUser.lastName ?? ""}`.trim() || memberUser.email;
                    const alreadyExists = conversations.some(c => c.type === "direct" && c.memberId === memberUser.id);
                    if (alreadyExists) return null;
                    return (
                      <Button
                        key={memberUser.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => startDirectChat.mutate(memberUser.id)}
                        disabled={startDirectChat.isPending}
                      >
                        <Plus className="w-3 h-3" />
                        <User className="w-3 h-3" />
                        <span className="truncate text-xs">{name}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
                  {isLeader ? "Start a conversation with your pod members above." : "No messages yet. Your pod leader will reach out here."}
                </p>
              </div>
            ) : (
              conversations.map(conv => (
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
                        {conv.memberInfo?.profileImageUrl && <AvatarImage src={conv.memberInfo.profileImageUrl} />}
                        <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                          {conv.memberInfo ? getInitials(`${conv.memberInfo.firstName ?? ""} ${conv.memberInfo.lastName ?? ""}`.trim() || conv.memberInfo.email) : "?"}
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
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`flex-1 flex flex-col bg-white dark:bg-gray-800 ${!showMobileChat ? "hidden md:flex" : "flex"}`}>
          {selectedConv ? (
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
                {selectedConv.type === "group" ? (
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <Avatar className="w-9 h-9">
                    {selectedConv.memberInfo?.profileImageUrl && <AvatarImage src={selectedConv.memberInfo.profileImageUrl} />}
                    <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                      {selectedConv.memberInfo ? getInitials(`${selectedConv.memberInfo.firstName ?? ""} ${selectedConv.memberInfo.lastName ?? ""}`.trim() || selectedConv.memberInfo.email) : "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    <ConversationName conv={selectedConv} currentUserId={currentUser?.id} />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedConv.pod?.clubName}
                    {selectedConv.type === "group" && " · Group chat"}
                  </p>
                </div>
                {selectedConv.type === "group" && (
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
                {isLeader
                  ? "Select a conversation or start a new one with your pod members."
                  : "Select a conversation to view your messages with your pod leader."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
