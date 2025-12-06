import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import { ArrowLeft, MapPin, Users, DollarSign, Calendar, CheckCircle, Send, User, Phone, Mail, LogOut, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Pod, JoinRequest, User as UserType, PodMember, LeaveRequest } from "@shared/schema";

type PodWithLeader = Pod & { leaderName: string | null; leaderPhone: string | null; leaderEmail: string | null };

export default function PodDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Fetch current authenticated user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
  });

  // Prepopulate form when dialog opens with authenticated user data
  useEffect(() => {
    if (isJoinDialogOpen && currentUser) {
      const fullName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ');
      setUserInfo({
        name: fullName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      });
    }
  }, [isJoinDialogOpen, currentUser]);

  // Fetch pod details (includes leader info)
  const { data: pod, isLoading: podLoading } = useQuery<PodWithLeader>({
    queryKey: ['/api/pods', id],
    queryFn: async () => {
      const response = await fetch(`/api/pods/${id}`);
      if (!response.ok) throw new Error('Failed to fetch pod');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch pod members to check if current user is a member
  const { data: podMembers } = useQuery<PodMember[]>({
    queryKey: ['/api/pods', id, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/pods/${id}/members`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id && !!currentUser,
  });

  // Fetch user's leave requests
  const { data: userLeaveRequests } = useQuery<(LeaveRequest & { pod: Pod | null })[]>({
    queryKey: ['/api/leave-requests/user'],
    queryFn: async () => {
      const response = await fetch('/api/leave-requests/user', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Check if current user is a member of this pod
  const isMember = currentUser && podMembers?.some(m => m.userId === currentUser.id);
  
  // Check if user has a pending leave request for this pod
  const pendingLeaveRequest = userLeaveRequests?.find(
    r => r.podId === parseInt(id || '0') && r.status === 'pending'
  );

  // Create leave request mutation
  const leaveRequestMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/pods/${id}/leave-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create leave request');
      }
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Leave request sent",
        description: "The pod leader will review your request and get back to you.",
      });
      setIsLeaveDialogOpen(false);
      setLeaveReason("");
      await queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send leave request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLeaveRequest = () => {
    leaveRequestMutation.mutate(leaveReason);
  };

  // Fetch user's join requests to check for active membership
  const { data: userJoinRequests } = useQuery<JoinRequest[]>({
    queryKey: ['/api/join-requests/user', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/join-requests/user/${currentUser?.id}`, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  // Check if user already has an active membership in any pod
  const hasActiveMembership = userJoinRequests?.some(r => r.status === 'accepted');
  
  // Check if user already has a pending request for this pod
  const hasPendingRequest = userJoinRequests?.some(
    r => r.podId === parseInt(id || '0') && r.status === 'pending'
  );

  // Create join request mutation
  const joinMutation = useMutation({
    mutationFn: async (requestData: { message: string; userInfo: typeof userInfo }) => {
      // Get authenticated user
      const userResponse = await fetch('/api/auth/user', { credentials: 'include' });
      if (!userResponse.ok) throw new Error('Not authenticated');
      const user = await userResponse.json();
      
      const response = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podId: parseInt(id || '0'),
          userId: user.id, // Get actual user ID from authenticated session
          message: requestData.message,
          userInfo: requestData.userInfo,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create join request');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.emailStatus === 'failed') {
        toast({
          title: "Join request saved",
          description: "Your request was saved, but we couldn't notify the pod leader. You can resend the notification from your dashboard.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Join request sent!",
          description: "The pod leader will review your request and get back to you.",
        });
      }
      setIsJoinDialogOpen(false);
      setJoinMessage("");
      setUserInfo({ name: "", email: "", phone: "" });
      // Invalidate all join request queries to ensure dashboard refreshes
      await queryClient.invalidateQueries({ queryKey: ['/api/join-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/pods'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot Join Pod",
        description: error.message || "Failed to send join request. Please try again.",
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

  const formatPrice = (amount: number) => {
    return `$${amount}`;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
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

  const userType = (localStorage.getItem('flexpod_user_type') === 'pod_leader' ? 'pod_leader' : 'pod_seeker') as 'pod_seeker' | 'pod_leader';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType={userType} />
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/pods")}
          className="mb-4"
          data-testid="button-back-to-pods"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pods
        </Button>
      </div>

      {/* Pod Details */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{pod.title}</CardTitle>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span className="text-lg">{pod.clubName} • {pod.clubRegion}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary mb-1">
                  {formatPrice(pod.costPerPerson)}
                  <span className="text-lg text-muted-foreground font-normal">/month</span>
                </div>
                <Badge variant="secondary">{pod.membershipType}</Badge>
              </div>
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
                    <span className="text-muted-foreground">Membership Type</span>
                    <Badge variant="outline">{pod.membershipType}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost per person</span>
                    <span className="font-semibold">{formatPrice(pod.costPerPerson)}/month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Available spots</span>
                    <span className="font-semibold">{pod.availableSpots} of {pod.totalSpots}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-semibold">{formatDate(pod.createdAt)}</span>
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
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold" data-testid="text-leader-name">
                        {pod.leaderName || "Pod Leader"}
                      </p>
                      {pod.leaderEmail && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-leader-email">
                          <Mail className="w-3 h-3" />
                          {pod.leaderEmail}
                        </p>
                      )}
                      {pod.leaderPhone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-leader-phone">
                          <Phone className="w-3 h-3" />
                          {pod.leaderPhone}
                        </p>
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
                      <Badge key={amenity} variant="outline" className="capitalize">
                        {amenity.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Member Status / Join/Leave Action */}
            {isMember ? (
              // Member view - show leave request option
              <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">You're a Member</h3>
                    </div>
                    <p className="text-muted-foreground">
                      You are currently a member of this pod. If you need to leave, you can submit a leave request.
                    </p>
                  </div>
                  <div className="ml-6">
                    {pendingLeaveRequest ? (
                      <Button variant="outline" disabled data-testid="button-leave-pending">
                        <Clock className="w-4 h-4 mr-2" />
                        Leave Request Pending
                      </Button>
                    ) : (
                      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-100" data-testid="button-request-to-leave">
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
                                Your leave request will be sent to the pod leader for approval. Once approved, you will be removed from this pod.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reason for Leaving (optional)</label>
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
                              {leaveRequestMutation.isPending ? "Sending..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Non-member view - show join request option
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {hasActiveMembership ? (
                      <>
                        <h3 className="font-semibold mb-2">Already a Pod Member</h3>
                        <p className="text-muted-foreground">
                          You can only be a member of one pod at a time. Leave your current pod first if you want to join this one.
                        </p>
                      </>
                    ) : hasPendingRequest ? (
                      <>
                        <h3 className="font-semibold mb-2">Request Pending</h3>
                        <p className="text-muted-foreground">
                          You already have a pending request for this pod. The pod leader will review and respond to your request.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold mb-2">Ready to Join?</h3>
                        <p className="text-muted-foreground">
                          Send a request to join this pod. The pod leader will review and respond to your request.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="ml-6">
                    {hasActiveMembership ? (
                      <Button disabled variant="secondary" data-testid="button-already-member">
                        <Users className="w-4 h-4 mr-2" />
                        Already in a Pod
                      </Button>
                    ) : hasPendingRequest ? (
                      <Button disabled variant="secondary" data-testid="button-pending-request">
                        <Clock className="w-4 h-4 mr-2" />
                        Request Pending
                      </Button>
                    ) : pod.availableSpots > 0 ? (
                      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-primary hover:bg-primary/90" data-testid="button-request-to-join">
                            <Send className="w-4 h-4 mr-2" />
                            Request to Join
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Join {pod.title}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name *</label>
                                <Input
                                  value={userInfo.name}
                                  onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="John Doe"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Email *</label>
                                <Input
                                  type="email"
                                  value={userInfo.email}
                                  onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                                  placeholder="john@example.com"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Phone Number</label>
                              <Input
                                type="tel"
                                value={userInfo.phone}
                                onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="(555) 123-4567"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Message to Pod Leader *</label>
                              <Textarea
                                value={joinMessage}
                                onChange={(e) => setJoinMessage(e.target.value)}
                                placeholder="Hi! I'd love to join your Bay Club pod. I'm interested in..."
                                rows={3}
                              />
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-600">
                                Your request will be sent to the pod leader. They'll review your information and get back to you.
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
                              {joinMutation.isPending ? "Sending..." : "Send Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Button disabled>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Pod Full
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