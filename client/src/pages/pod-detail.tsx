import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import {
  ArrowLeft,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Send,
  User,
  Phone,
  Mail,
  LogOut,
  Clock,
  Share2,
  Copy,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import PodReviews from "@/components/PodReviews";
import { useToast } from "@/hooks/use-toast";
import type {
  Pod,
  JoinRequest,
  User as UserType,
  PodMember,
  LeaveRequest,
} from "@shared/schema";

type PodWithLeader = Pod & {
  leaderName: string | null;
  leaderPhone: string | null;
  leaderEmail: string | null;
  leaderProfileImage: string | null;
};

export default function PodDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Fetch current authenticated user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
  });

  // Prepopulate form + AI-generate message when dialog opens
  useEffect(() => {
    if (isJoinDialogOpen && currentUser) {
      const fullName = [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(" ");
      setUserInfo({
        name: fullName || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      });
      // Auto-generate personalized message
      if (id) {
        setJoinMessage("");
        setIsGeneratingMessage(true);
        fetch("/api/ai/generate-join-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ podId: id }),
        })
          .then(r => r.json())
          .then(data => { if (data.message) setJoinMessage(data.message); })
          .catch(() => {})
          .finally(() => setIsGeneratingMessage(false));
      }
    }
  }, [isJoinDialogOpen, currentUser, id]);

  // Fetch pod details (includes leader info)
  const { data: pod, isLoading: podLoading } = useQuery<PodWithLeader>({
    queryKey: ["/api/pods", id],
    queryFn: async () => {
      const response = await fetch(`/api/pods/${id}`);
      if (!response.ok) throw new Error("Failed to fetch pod");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch pod members to check if current user is a member
  const { data: podMembers } = useQuery<PodMember[]>({
    queryKey: ["/api/pods", id, "members"],
    queryFn: async () => {
      const response = await fetch(`/api/pods/${id}/members`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id && !!currentUser,
  });

  // Fetch user's leave requests
  const { data: userLeaveRequests } = useQuery<
    (LeaveRequest & { pod: Pod | null })[]
  >({
    queryKey: ["/api/leave-requests/user"],
    queryFn: async () => {
      const response = await fetch("/api/leave-requests/user", {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Check if current user is a member of this pod
  const isMember =
    currentUser && podMembers?.some((m) => m.userId === currentUser.id);

  // Check if user has a pending leave request for this pod
  const pendingLeaveRequest = userLeaveRequests?.find(
    (r) => r.podId === parseInt(id || "0") && r.status === "pending",
  );

  // Check if user has an approved leave request for this pod
  const approvedLeaveRequest = userLeaveRequests?.find(
    (r) => r.podId === parseInt(id || "0") && r.status === "approved",
  );

  // Create leave request mutation
  const leaveRequestMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/pods/${id}/leave-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create leave request");
      }
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Leave request sent",
        description:
          "The pod leader will review your request and get back to you.",
      });
      setIsLeaveDialogOpen(false);
      setLeaveReason("");
      await queryClient.invalidateQueries({
        queryKey: ["/api/leave-requests/user"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to send leave request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLeaveRequest = () => {
    leaveRequestMutation.mutate(leaveReason);
  };

  // Fetch user's join requests to check for active membership
  const { data: userJoinRequests } = useQuery<JoinRequest[]>({
    queryKey: ["/api/join-requests/user", currentUser?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/join-requests/user/${currentUser?.id}`,
        { credentials: "include" },
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Check if user already has an active membership in any pod
  const hasActiveMembership = userJoinRequests?.some(
    (r) => r.status === "accepted",
  );

  // Check if user already has a pending request for this pod
  const hasPendingRequest = userJoinRequests?.some(
    (r) => r.podId === parseInt(id || "0") && r.status === "pending",
  );

  // Fetch pods where current user is a leader to check if they're a pod leader
  const { data: userLeaderPods } = useQuery<Pod[]>({
    queryKey: ["/api/pods/leader", currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/pods/leader/${currentUser?.id}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Check if user is a pod leader
  const isUserPodLeader = userLeaderPods && userLeaderPods.length > 0;

  // Create join request mutation
  const joinMutation = useMutation({
    mutationFn: async (requestData: {
      message: string;
      userInfo: typeof userInfo;
    }) => {
      // Get authenticated user
      const userResponse = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (!userResponse.ok) throw new Error("Not authenticated");
      const user = await userResponse.json();

      const response = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          podId: parseInt(id || "0"),
          userId: user.id, // Get actual user ID from authenticated session
          message: requestData.message,
          userInfo: requestData.userInfo,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        const err = new Error(error.message || "Failed to create join request");
        (err as any).code = error.code;
        throw err;
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.emailStatus === "failed") {
        toast({
          title: "Join request saved",
          description:
            "Your request was saved, but we couldn't notify the pod leader. You can resend the notification from your dashboard.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Join request sent!",
          description:
            "The pod leader will review your request and get back to you.",
        });
      }
      setIsJoinDialogOpen(false);
      setJoinMessage("");
      setUserInfo({ name: "", email: "", phone: "" });
      // Invalidate all join request queries to ensure dashboard refreshes
      await queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
      await queryClient.invalidateQueries({
        queryKey: ["/api/join-requests/user"],
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/pods"] });
    },
    onError: (error: Error) => {
      const isBalanceError = (error as any).code === "OUTSTANDING_BALANCE";
      toast({
        title: isBalanceError ? "Outstanding Balance" : "Cannot Join Pod",
        description: isBalanceError
          ? `${error.message} Visit your dashboard to mark your balance as paid.`
          : error.message || "Failed to send join request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleJoinRequest = () => {
    if (!userInfo.name || !userInfo.email || !joinMessage) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    joinMutation.mutate({ message: joinMessage, userInfo });
  };

  // Inquiry mutation — lets any authenticated non-member message the pod leader
  const inquiryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/conversations/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ podId: parseInt(id || "0") }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start conversation");
      }
      return response.json();
    },
    onSuccess: (conv) => {
      navigate(`/messages?convId=${conv.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not open chat",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (amount: number) => {
    return `$${amount}`;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Unknown";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  // Share functionality
  const getPodShareUrl = () => {
    return `${window.location.origin}/pods/${id}`;
  };

  const getShareText = () => {
    if (!pod) return "";
    return `Check out this gym membership pod: ${pod.title} at ${pod.clubName} - $${pod.costPerPerson}/month`;
  };

  const handleShareEmail = () => {
    const url = getPodShareUrl();
    const subject = encodeURIComponent(
      `FlexPod: ${pod?.title || "Gym Membership Pod"}`,
    );
    const body = encodeURIComponent(
      `${getShareText()}\n\nView details: ${url}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareSMS = () => {
    const url = getPodShareUrl();
    const text = encodeURIComponent(`${getShareText()} ${url}`);
    window.open(`sms:?body=${text}`, "_blank");
  };

  const handleCopyLink = async () => {
    const url = getPodShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Pod link has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually from the address bar.",
        variant: "destructive",
      });
    }
  };

  if (podLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading pod details...</p>
        </div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pod not found</h1>
          <Button onClick={() => navigate("/pods")}>Back to Pods</Button>
        </div>
      </div>
    );
  }

  const userType = (
    localStorage.getItem("flexpod_user_type") === "pod_leader"
      ? "pod_leader"
      : "pod_seeker"
  ) as "pod_seeker" | "pod_leader";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType={userType} />
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate(currentUser ? "/pods" : "/")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentUser ? "Back to Pods" : "Back to home"}
        </Button>
      </div>

      {/* Pod Details */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          {/* Pod Image */}
          {pod.imageUrl && (
            <div className="w-full h-48 md:h-64 overflow-hidden rounded-t-lg">
              <img
                src={pod.imageUrl}
                alt={pod.title}
                className="w-full h-full object-cover"
                data-testid="img-pod-image"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{pod.title}</CardTitle>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span className="text-lg">
                    {pod.clubName} • {pod.clubRegion}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary mb-1">
                  {formatPrice(pod.costPerPerson)}
                  <span className="text-lg text-muted-foreground font-normal">
                    /month
                  </span>
                </div>
                <Badge variant="secondary">{pod.membershipType}</Badge>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t mt-4">
              <span className="text-sm text-muted-foreground mr-2">
                <Share2 className="w-4 h-4 inline mr-1" />
                Share this pod:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareEmail}
                data-testid="button-share-email"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareSMS}
                data-testid="button-share-sms"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy Link
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-3">About This Pod</h3>
              <p className="text-muted-foreground leading-relaxed">
                {pod.description}
              </p>
            </div>

            <Separator />

            {/* Membership Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Membership Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Membership Type
                    </span>
                    <Badge variant="outline">{pod.membershipType}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Cost per person
                    </span>
                    <span className="font-semibold">
                      {formatPrice(pod.costPerPerson)}/month
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Available spots
                    </span>
                    <span className="font-semibold">
                      {pod.availableSpots} of {pod.totalSpots}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-semibold">
                      {formatDate(pod.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Location & Access</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Club</span>
                    <span className="font-semibold">{pod.clubName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Region</span>
                    <span className="font-semibold">{pod.clubRegion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-semibold">{pod.clubAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pod Leader */}
            <div>
              <h3 className="font-semibold mb-3">Pod Leader</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {pod.leaderProfileImage ? (
                      <img
                        src={pod.leaderProfileImage}
                        alt={pod.leaderName || "Pod Leader"}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                        data-testid="img-leader-profile"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                        {pod.leaderName ? (
                          <span className="text-lg font-semibold text-primary" data-testid="text-leader-initials">
                            {pod.leaderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        ) : (
                          <User className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    )}
                    <div>
                      {currentUser ? (
                        <p
                          className="font-semibold"
                          data-testid="text-leader-name"
                        >
                          {pod.leaderName || "Pod Leader"}
                        </p>
                      ) : (
                        <div>
                          <p className="font-semibold text-muted-foreground" data-testid="text-leader-hidden">
                            Sign in to view leader details
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Register or sign in to see pod details
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {pod.amenities && pod.amenities.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Available Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {pod.amenities.map((amenity) => (
                      <Badge
                        key={amenity}
                        variant="outline"
                        className="capitalize"
                      >
                        {amenity.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Reviews */}
            <Separator />
            <PodReviews
              podId={pod.id}
              currentUserId={currentUser?.id}
              isMember={!!isMember}
            />

            <Separator />

            {/* Member Status / Join/Leave Action */}
            {isMember ? (
              // Member view - show leave request option and fellow members
              <>
                <div className={`p-6 rounded-lg border ${
                  approvedLeaveRequest
                    ? "bg-blue-50 border-blue-200"
                    : pendingLeaveRequest
                    ? "bg-amber-50 border-amber-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {approvedLeaveRequest ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-blue-800">
                              Leave Approved
                            </h3>
                          </div>
                          <p className="text-blue-700">
                            Your leave request has been approved. You will be removed from this pod on{" "}
                            <strong>
                              {approvedLeaveRequest.exitDate
                                ? new Date(approvedLeaveRequest.exitDate).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                : "your scheduled exit date"}
                            </strong>.
                          </p>
                        </>
                      ) : pendingLeaveRequest ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-amber-600" />
                            <h3 className="font-semibold text-amber-800">
                              Leave Request Pending
                            </h3>
                          </div>
                          <p className="text-amber-700">
                            Your request to leave this pod is awaiting approval from the pod leader.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <h3 className="font-semibold text-green-800">
                              You're a Member
                            </h3>
                          </div>
                          <p className="text-muted-foreground">
                            You are currently a member of this pod. If you need to
                            leave, you can submit a leave request.
                          </p>
                        </>
                      )}
                    </div>
                    <div className="ml-6">
                      {approvedLeaveRequest ? (
                        <Button variant="outline" disabled className="border-blue-300 text-blue-700">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          Leaving{approvedLeaveRequest.exitDate
                            ? ` ${new Date(approvedLeaveRequest.exitDate).toLocaleDateString()}`
                            : " Soon"}
                        </Button>
                      ) : pendingLeaveRequest ? (
                        <Button
                          variant="outline"
                          disabled
                          data-testid="button-leave-pending"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Leave Request Pending
                        </Button>
                      ) : (
                        <Dialog
                          open={isLeaveDialogOpen}
                          onOpenChange={setIsLeaveDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-amber-500 text-amber-700 hover:bg-amber-100"
                              data-testid="button-request-to-leave"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Request to Leave
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Leave {pod.title}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <p className="text-sm text-amber-800">
                                  Your leave request will be sent to the pod
                                  leader for approval. Once approved, you will be
                                  removed from this pod.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Reason for Leaving (optional)
                                </label>
                                <Textarea
                                  value={leaveReason}
                                  onChange={(e) => setLeaveReason(e.target.value)}
                                  placeholder="Let the pod leader know why you'd like to leave..."
                                  rows={3}
                                  data-testid="input-leave-reason"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => setIsLeaveDialogOpen(false)}
                                disabled={leaveRequestMutation.isPending}
                                data-testid="button-cancel-leave"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleLeaveRequest}
                                disabled={leaveRequestMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-700"
                                data-testid="button-submit-leave"
                              >
                                {leaveRequestMutation.isPending
                                  ? "Sending..."
                                  : "Submit Request"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fellow Pod Members Section */}
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Pod Members ({podMembers?.length || 0})
                  </h3>
                  {podMembers && podMembers.length > 0 ? (
                    <div className="space-y-3">
                      {podMembers.map((member: any) => (
                        <div
                          key={member.id}
                          className="p-4 bg-gray-50 rounded-lg border"
                          data-testid={`member-card-${member.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                              {(member.userName || member.user?.firstName || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold flex items-center gap-2 flex-wrap">
                                {member.userName || `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || "Unknown Member"}
                                {member.userId === currentUser?.id && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </p>
                              {member.joinedAt && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Calendar className="w-3 h-3 flex-shrink-0" />
                                  <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No other members yet.</p>
                  )}
                </div>
              </>
            ) : (
              // Non-member view - show join request option
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {!currentUser ? (
                      <>
                        <h3 className="font-semibold mb-2">
                          Interested in this Pod?
                        </h3>
                        <p className="text-muted-foreground">
                          Sign in to request to join this pod. The pod leader
                          will review and respond to your request.
                        </p>
                      </>
                    ) : isUserPodLeader ? (
                      <>
                        <h3 className="font-semibold mb-2">
                          You're a Pod Leader
                        </h3>
                        <p className="text-muted-foreground">
                          Pod leaders cannot join other pods while leading one.
                          Focus on managing your own pod members.
                        </p>
                      </>
                    ) : hasActiveMembership ? (
                      <>
                        <h3 className="font-semibold mb-2">
                          Already a Pod Member
                        </h3>
                        <p className="text-muted-foreground">
                          You can only be a member of one pod at a time. Leave
                          your current pod first if you want to join this one.
                        </p>
                      </>
                    ) : hasPendingRequest ? (
                      <>
                        <h3 className="font-semibold mb-2">Request Pending</h3>
                        <p className="text-muted-foreground">
                          You already have a pending request for this pod. The
                          pod leader will review and respond to your request.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold mb-2">Ready to Join?</h3>
                        <p className="text-muted-foreground">
                          Send a request to join this pod. The pod leader will
                          review and respond to your request.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="ml-6 flex flex-col items-end gap-2">
                    {!currentUser ? (
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => navigate("/login")}
                        data-testid="button-sign-in-to-join"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Sign in to Join
                      </Button>
                    ) : isUserPodLeader ? (
                      <Button
                        disabled
                        variant="secondary"
                        data-testid="button-pod-leader"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Pod Leader
                      </Button>
                    ) : hasActiveMembership ? (
                      <Button
                        disabled
                        variant="secondary"
                        data-testid="button-already-member"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Already in a Pod
                      </Button>
                    ) : hasPendingRequest ? (
                      <Button
                        disabled
                        variant="secondary"
                        data-testid="button-pending-request"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Request Pending
                      </Button>
                    ) : (
                      <Dialog
                        open={isJoinDialogOpen}
                        onOpenChange={pod.availableSpots > 0 ? setIsJoinDialogOpen : undefined}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="bg-primary hover:bg-primary/90"
                            disabled={pod.availableSpots <= 0}
                            data-testid="button-request-to-join"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {pod.availableSpots <= 0 ? "Pod Full" : "Request to Join"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Join {pod.title}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Full Name *
                                </label>
                                <Input
                                  value={userInfo.name}
                                  onChange={(e) =>
                                    setUserInfo((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  placeholder="John Doe"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Email *
                                </label>
                                <Input
                                  type="email"
                                  value={userInfo.email}
                                  onChange={(e) =>
                                    setUserInfo((prev) => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  placeholder="john@example.com"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Phone Number
                              </label>
                              <Input
                                type="tel"
                                value={userInfo.phone}
                                onChange={(e) =>
                                  setUserInfo((prev) => ({
                                    ...prev,
                                    phone: e.target.value,
                                  }))
                                }
                                placeholder="(555) 123-4567"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">
                                  Message to Pod Leader *
                                </label>
                                <button
                                  type="button"
                                  disabled={isGeneratingMessage}
                                  onClick={() => {
                                    if (!id) return;
                                    setIsGeneratingMessage(true);
                                    setJoinMessage("");
                                    fetch("/api/ai/generate-join-message", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      credentials: "include",
                                      body: JSON.stringify({ podId: id }),
                                    })
                                      .then(r => r.json())
                                      .then(data => { if (data.message) setJoinMessage(data.message); })
                                      .catch(() => {})
                                      .finally(() => setIsGeneratingMessage(false));
                                  }}
                                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isGeneratingMessage ? (
                                    <>
                                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                      </svg>
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                      </svg>
                                      Regenerate with AI
                                    </>
                                  )}
                                </button>
                              </div>
                              {isGeneratingMessage ? (
                                <div className="min-h-[100px] rounded-md border border-input bg-muted/40 flex items-center justify-center gap-2 text-sm text-purple-600">
                                  <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                  </svg>
                                  Writing your message...
                                </div>
                              ) : (
                                <Textarea
                                  value={joinMessage}
                                  onChange={(e) => setJoinMessage(e.target.value)}
                                  placeholder="Hi! I'd love to join your Bay Club pod. I'm interested in..."
                                  rows={4}
                                />
                              )}
                              <p className="text-xs text-gray-400">AI-generated — feel free to edit before sending</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">
                                Your request will be sent to the pod leader.
                                They'll review your information and get back to
                                you.
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsJoinDialogOpen(false)}
                              disabled={joinMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleJoinRequest}
                              disabled={joinMutation.isPending}
                              className="bg-primary hover:bg-primary/90"
                            >
                              {joinMutation.isPending
                                ? "Sending..."
                                : "Send Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {/* Message Leader button — visible to any authenticated non-leader non-member */}
                    {currentUser && !isUserPodLeader && !isMember && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => inquiryMutation.mutate()}
                        disabled={inquiryMutation.isPending}
                        data-testid="button-message-leader"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {inquiryMutation.isPending ? "Opening..." : "Message Leader"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
