import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { 
  User, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Phone,
  Mail,
  Edit3,
  Zap,
  MailWarning,
  RefreshCw,
  Crown,
  ArrowRight,
  Plus,
  LogOut,
  CalendarDays,
  CreditCard
} from "lucide-react";
import { useLocation } from "wouter";
import type { Pod, JoinRequest, LeaveRequest } from "@shared/schema";
import PaymentHistory from "@/components/PaymentHistory";

// Phone number formatting utility
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits})`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primaryCampus: string;
  primaryClub: string;
  membershipLevel: string;
  membershipId: string;
  profileImageUrl?: string;
}

interface PodMember {
  id: number;
  podId: number;
  userId: number;
  isActive: boolean;
  userName?: string;
  userEmail?: string;
  joinedAt?: string;
}

interface LeaveRequestWithPod extends LeaveRequest {
  pod: Pod | null;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPodForMembers, setSelectedPodForMembers] = useState<number | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedPodForLeave, setSelectedPodForLeave] = useState<number | null>(null);
  const [leaveReason, setLeaveReason] = useState("");

  // Fetch authenticated user with all profile data
  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', { credentials: 'include' });
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Map authenticated user data to userData format
  const userData: UserData | null = authUser ? {
    firstName: authUser.firstName || '',
    lastName: authUser.lastName || '',
    email: authUser.email || '',
    phone: authUser.phone || '',
    primaryCampus: authUser.preferredRegion || '',
    primaryClub: authUser.primaryClub || '',
    membershipLevel: authUser.membershipLevel || '',
    membershipId: authUser.membershipId || '',
    profileImageUrl: authUser.profileImageUrl || '',
  } : null;

  // Fetch user's join requests
  const { data: joinRequests, isLoading: requestsLoading } = useQuery<JoinRequest[]>({
    queryKey: ['/api/join-requests', 'user', authUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/join-requests/user/${authUser?.id}`);
      if (!response.ok) throw new Error('Failed to fetch join requests');
      return response.json();
    },
    enabled: !!authUser?.id, // Only run when we have the user ID
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to ensure fresh data
  });

  // Fetch all pods to show user's active memberships
  const { data: allPods, isLoading: podsLoading } = useQuery<Pod[]>({
    queryKey: ['/api/pods'],
    queryFn: async () => {
      const response = await fetch('/api/pods');
      if (!response.ok) throw new Error('Failed to fetch pods');
      return response.json();
    },
  });

  // Filter pods where user is a member (mock logic)
  const activePods = allPods?.filter(pod => 
    // In a real app, this would check actual membership status
    joinRequests?.some(request => 
      request.podId === pod.id && request.status === 'accepted'
    )
  ) || [];

  // Check if user also has a pod as a leader (dual-role support)
  const { data: userLeaderPods } = useQuery<Pod[]>({
    queryKey: ['/api/pods/leader', authUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/pods/leader/${authUser?.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!authUser?.id,
  });

  const hasLeaderPod = userLeaderPods && userLeaderPods.length > 0;
  const leaderPod = hasLeaderPod ? userLeaderPods[0] : null;

  // Fetch pod members for selected pod
  const { data: podMembers, isLoading: membersLoading } = useQuery<PodMember[]>({
    queryKey: ['/api/pods', selectedPodForMembers, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/pods/${selectedPodForMembers}/members`);
      if (!response.ok) throw new Error('Failed to fetch pod members');
      return response.json();
    },
    enabled: !!selectedPodForMembers,
  });

  // Fetch user's leave requests
  const { data: leaveRequests, isLoading: leaveRequestsLoading } = useQuery<LeaveRequestWithPod[]>({
    queryKey: ['/api/leave-requests/user'],
    queryFn: async () => {
      const response = await fetch('/api/leave-requests/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      return response.json();
    },
    enabled: !!authUser?.id,
  });

  // Leave request mutation
  const leaveRequestMutation = useMutation({
    mutationFn: async ({ podId, reason }: { podId: number; reason: string }) => {
      const response = await fetch(`/api/pods/${podId}/leave-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit leave request');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Leave request submitted",
        description: "Your request to leave the pod has been sent to the pod leader for approval.",
      });
      setLeaveDialogOpen(false);
      setLeaveReason("");
      setSelectedPodForLeave(null);
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check if user has a pending/approved leave request for a pod
  const getLeaveRequestForPod = (podId: number) => {
    return leaveRequests?.find(lr => lr.podId === podId && (lr.status === 'pending' || lr.status === 'approved'));
  };

  // Resend email mutation
  const resendEmailMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/join-requests/${requestId}/resend-email`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resend email');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.emailStatus === 'sent') {
        toast({
          title: "Email sent successfully",
          description: "The pod leader has been notified of your join request.",
        });
      } else {
        toast({
          title: "Email sending failed",
          description: "We couldn't send the notification. Please try again later.",
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests', 'user', authUser?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend email notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel join request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/join-requests/${requestId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel request');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request cancelled",
        description: "Your join request has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests', 'user', authUser?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark outstanding balance as paid mutation
  const markBalancePaidMutation = useMutation({
    mutationFn: async (leaveRequestId: number) => {
      const response = await fetch(`/api/leave-requests/${leaveRequestId}/mark-balance-paid`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark balance as paid');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Balance confirmed",
        description: "Your balance has been marked as paid. You can now apply to join a new pod.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leave-requests/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update balance status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'left': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date | null | string) => {
    if (!date) return 'Unknown';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Show loading state while fetching user data
  if (authLoading || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Loading Your Dashboard</CardTitle>
            <p className="text-muted-foreground">Please wait while we load your profile...</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType="pod_seeker" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Avatar className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                    {userData.profileImageUrl && (
                      <AvatarImage src={userData.profileImageUrl} alt="Profile" data-testid="img-profile-avatar" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-base sm:text-lg">
                      {getUserInitials(userData.firstName, userData.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-semibold truncate">{userData.firstName} {userData.lastName}</h2>
                    <p className="text-sm sm:text-base text-gray-600 truncate">{userData.membershipLevel}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{userData.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{formatPhoneNumber(userData.phone)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{userData.primaryClub}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{userData.primaryCampus} Campus</span>
                </div>
                <Separator />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => navigate('/edit-profile')}
                  data-testid="button-edit-profile"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-4 sm:mt-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{activePods.length}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Active Pods</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-pink-600">{joinRequests?.filter(r => r.status === 'pending').length || 0}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Pending Requests</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pod Leader Section - Create or Switch to Leader Dashboard */}
            <Card className="mt-4 sm:mt-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  <span>Pod Leader</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {hasLeaderPod ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      You're leading: <span className="font-semibold text-purple-700">{leaderPod?.title || leaderPod?.clubName}</span>
                    </p>
                    <Button 
                      onClick={() => navigate('/pod-leader-dashboard')}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      data-testid="button-switch-to-leader-dashboard"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Switch to Leader Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Have a Bay Club membership to share? Create your own pod and help others save on membership fees.
                    </p>
                    <Button 
                      onClick={() => navigate('/pod-leader-registration')}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      data-testid="button-create-your-pod"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your Own Pod
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="requests" className="w-full">
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 h-10 sm:h-11 gap-1 sm:gap-0">
                  <TabsTrigger value="requests" className="flex-shrink-0 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-join-requests">
                    <Clock className="w-3.5 h-3.5 mr-1.5 sm:hidden" />
                    <span className="hidden sm:inline">Join Requests</span>
                    <span className="sm:hidden">Requests</span>
                  </TabsTrigger>
                  <TabsTrigger value="members" className="flex-shrink-0 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-pod-members">
                    <Users className="w-3.5 h-3.5 mr-1.5 sm:hidden" />
                    <span className="hidden sm:inline">Pod Members</span>
                    <span className="sm:hidden">Members</span>
                  </TabsTrigger>
                  <TabsTrigger value="pods" className="flex-shrink-0 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-my-pods">
                    <Zap className="w-3.5 h-3.5 mr-1.5 sm:hidden" />
                    <span className="hidden sm:inline">My Pods</span>
                    <span className="sm:hidden">Pods</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex-shrink-0 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-payments">
                    <DollarSign className="w-3.5 h-3.5 mr-1.5 sm:hidden" />
                    <span className="hidden sm:inline">Payments</span>
                    <span className="sm:hidden">Pay</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pods" className="mt-4 sm:mt-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>Active Pod Memberships</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {activePods.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Active Pods</h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-4">You haven't joined any pods yet</p>
                        <Button 
                          onClick={() => navigate('/pods')} 
                          size="sm" 
                          className="w-full sm:w-auto"
                          data-testid="button-browse-available-pods"
                        >
                          Browse Available Pods
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {activePods.map((pod) => {
                          const leaveRequest = getLeaveRequestForPod(pod.id);
                          return (
                            <div key={pod.id} className="border rounded-lg overflow-hidden hover:bg-gray-50 transition-colors" data-testid={`pod-membership-${pod.id}`}>
                              {pod.imageUrl && (
                                <div className="w-full h-32 overflow-hidden">
                                  <img
                                    src={pod.imageUrl}
                                    alt={pod.clubName}
                                    className="w-full h-full object-cover"
                                    data-testid={`pod-image-${pod.id}`}
                                  />
                                </div>
                              )}
                              <div className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                                      <h3 className="font-semibold text-base sm:text-lg truncate">{pod.clubName}</h3>
                                      <Badge variant="outline" className="self-start sm:self-auto">{pod.clubRegion}</Badge>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 mb-2">
                                      <div className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{pod.clubAddress}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                                        <span>${(pod.costPerPerson)}/month</span>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">{pod.description}</p>
                                    
                                    {/* Leave Request Status */}
                                    {leaveRequest && (
                                      <div className="mt-3 space-y-2">
                                        <div className="p-2 rounded-md bg-amber-50 border border-amber-200">
                                          {leaveRequest.status === 'pending' && (
                                            <div className="flex items-center space-x-2 text-amber-700">
                                              <Clock className="w-4 h-4" />
                                              <span className="text-sm font-medium">Leave request pending approval</span>
                                            </div>
                                          )}
                                          {leaveRequest.status === 'approved' && leaveRequest.exitDate && (
                                            <div className="flex items-center space-x-2 text-green-700">
                                              <CalendarDays className="w-4 h-4" />
                                              <span className="text-sm font-medium">
                                                Leaving on {new Date(leaveRequest.exitDate).toLocaleDateString()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        {/* Outstanding Balance Notice */}
                                        {leaveRequest.status === 'approved' &&
                                          leaveRequest.outstandingBalance > 0 &&
                                          !leaveRequest.balancePaidAt && (
                                          <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                            <div className="flex items-start space-x-2">
                                              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-red-700">Outstanding Balance</p>
                                                <p className="text-sm text-red-600 mt-0.5">
                                                  You owe <span className="font-bold">${(leaveRequest.outstandingBalance / 100).toFixed(2)}</span> before you can join a new pod.
                                                </p>
                                                <p className="text-xs text-red-500 mt-1">
                                                  Once paid, your new pod membership will start on {leaveRequest.exitDate ? new Date(leaveRequest.exitDate).toLocaleDateString() : 'your exit date'}.
                                                </p>
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="mt-2 w-full border-red-300 text-red-700 hover:bg-red-100"
                                              onClick={() => markBalancePaidMutation.mutate(leaveRequest.id)}
                                              disabled={markBalancePaidMutation.isPending}
                                            >
                                              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                              {markBalancePaidMutation.isPending ? "Confirming..." : "Confirm Balance Paid"}
                                            </Button>
                                          </div>
                                        )}
                                        {/* Balance cleared notice */}
                                        {leaveRequest.status === 'approved' &&
                                          leaveRequest.outstandingBalance > 0 &&
                                          leaveRequest.balancePaidAt && (
                                          <div className="p-2 rounded-md bg-green-50 border border-green-200">
                                            <div className="flex items-center space-x-2 text-green-700">
                                              <CheckCircle className="w-4 h-4" />
                                              <span className="text-sm font-medium">
                                                Balance paid — you can now join a new pod
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/pods/${pod.id}`)}
                                      className="w-full sm:w-auto"
                                      data-testid={`button-view-pod-${pod.id}`}
                                    >
                                      View Details
                                    </Button>
                                    {!leaveRequest && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                          setSelectedPodForLeave(pod.id);
                                          setLeaveDialogOpen(true);
                                        }}
                                        className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`button-leave-pod-${pod.id}`}
                                      >
                                        <LogOut className="w-4 h-4 mr-1" />
                                        Leave Pod
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requests" className="mt-4 sm:mt-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>Join Request History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {requestsLoading ? (
                      <div className="text-center py-6 sm:py-8">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-sm sm:text-base text-gray-600 mt-2">Loading requests...</p>
                      </div>
                    ) : !joinRequests || joinRequests.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Join Requests</h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-4">You haven't requested to join any pods yet</p>
                        <Button 
                          onClick={() => navigate('/pods')} 
                          size="sm" 
                          className="w-full sm:w-auto"
                          data-testid="button-browse-pods-from-requests"
                        >
                          Browse Available Pods
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {joinRequests.map((request) => {
                          const pod = allPods?.find(p => p.id === request.podId);
                          const emailFailed = request.emailStatus === 'failed';
                          return (
                            <div key={request.id} className="border rounded-lg p-3 sm:p-4" data-testid={`request-${request.id}`}>
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base sm:text-lg truncate">{pod?.clubName || 'Unknown Pod'}</h3>
                                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-1">
                                    <Badge className={getStatusColor(request.status)} data-testid={`status-${request.status}`}>
                                      <div className="flex items-center space-x-1">
                                        {getStatusIcon(request.status)}
                                        <span className="capitalize">{request.status}</span>
                                      </div>
                                    </Badge>
                                    {emailFailed && (
                                      <Badge className="bg-orange-100 text-orange-800" data-testid={`email-status-${request.id}`}>
                                        <div className="flex items-center space-x-1">
                                          <MailWarning className="w-4 h-4" />
                                          <span>Email not sent</span>
                                        </div>
                                      </Badge>
                                    )}
                                    <span className="text-xs sm:text-sm text-gray-600">
                                      {formatDate(request.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                  {emailFailed && request.status === 'pending' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => resendEmailMutation.mutate(request.id)}
                                      disabled={resendEmailMutation.isPending}
                                      className="w-full sm:w-auto flex items-center space-x-1"
                                      data-testid={`button-resend-email-${request.id}`}
                                    >
                                      <RefreshCw className={`w-4 h-4 ${resendEmailMutation.isPending ? 'animate-spin' : ''}`} />
                                      <span>{resendEmailMutation.isPending ? 'Sending...' : 'Resend Email'}</span>
                                    </Button>
                                  )}
                                  {request.status === 'pending' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => cancelRequestMutation.mutate(request.id)}
                                      disabled={cancelRequestMutation.isPending}
                                      className="w-full sm:w-auto flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      data-testid={`button-cancel-request-${request.id}`}
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>{cancelRequestMutation.isPending ? 'Cancelling...' : 'Cancel'}</span>
                                    </Button>
                                  )}
                                  {pod && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => navigate(`/pods/${pod.id}`)}
                                      className="w-full sm:w-auto flex-shrink-0"
                                      data-testid={`button-view-request-pod-${pod.id}`}
                                    >
                                      View Pod
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {emailFailed && request.status === 'pending' && (
                                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-3">
                                  <p className="text-sm text-orange-800">
                                    <strong>Notification not sent:</strong> The pod leader was not notified about your request. Click the "Resend Email" button above to notify them.
                                  </p>
                                </div>
                              )}
                              {request.scheduledStartDate && request.status === 'pending' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                                  <div className="flex items-center space-x-2 text-blue-700">
                                    <CalendarDays className="w-4 h-4 flex-shrink-0" />
                                    <p className="text-sm">
                                      <strong>Scheduled start:</strong> {new Date(request.scheduledStartDate).toLocaleDateString()} — pending balance clearance from previous pod.
                                    </p>
                                  </div>
                                </div>
                              )}
                              {request.message && (
                                <div className="bg-gray-50 rounded-md p-3 mt-3">
                                  <p className="text-sm text-gray-700">
                                    <strong>Your message:</strong> {request.message}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="mt-4 sm:mt-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>Pod Members</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {activePods.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Active Pods</h3>
                        <p className="text-sm sm:text-base text-gray-600 mb-4">Join a pod first to see members</p>
                        <Button 
                          onClick={() => navigate('/pods')} 
                          size="sm" 
                          className="w-full sm:w-auto"
                          data-testid="button-browse-pods-for-members"
                        >
                          Browse Available Pods
                        </Button>
                      </div>
                    ) : !selectedPodForMembers ? (
                      <div className="space-y-4">
                        <p className="text-sm sm:text-base text-gray-600 mb-4">Select a pod to view its members:</p>
                        <div className="grid grid-cols-1 gap-3">
                          {activePods.map((pod) => (
                            <div
                              key={pod.id}
                              className="border rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => setSelectedPodForMembers(pod.id)}
                              data-testid={`select-pod-for-members-${pod.id}`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold truncate">{pod.clubName}</h4>
                                  <p className="text-sm text-gray-600 truncate">{pod.clubRegion}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                                    <Users className="w-4 h-4" />
                                    <span>{pod.totalSpots - (pod.availableSpots || 0)} members</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate">
                              {activePods.find(p => p.id === selectedPodForMembers)?.clubName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {activePods.find(p => p.id === selectedPodForMembers)?.clubRegion}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPodForMembers(null)}
                            className="w-full sm:w-auto"
                            data-testid="button-back-to-pod-list"
                          >
                            ← Back to Pods
                          </Button>
                        </div>
                        <Separator />
                        {membersLoading ? (
                          <div className="text-center py-6 sm:py-8">
                            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-sm sm:text-base text-gray-600 mt-2">Loading members...</p>
                          </div>
                        ) : !podMembers || podMembers.length === 0 ? (
                          <div className="text-center py-6 sm:py-8">
                            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Members Yet</h3>
                            <p className="text-sm sm:text-base text-gray-600">This pod doesn't have any other members yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {podMembers.map((member) => (
                              <div key={member.id} className="border rounded-lg p-3 sm:p-4" data-testid={`member-${member.id}`}>
                                <div className="flex items-center space-x-3">
                                  <Avatar className="w-10 h-10 flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                                      {member.userName ? member.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium truncate">{member.userName || 'Unknown Member'}</h4>
                                    {member.joinedAt && (
                                      <p className="text-xs text-gray-500">
                                        Joined {formatDate(member.joinedAt)}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="flex-shrink-0">
                                    {member.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="mt-4 sm:mt-6">
                <PaymentHistory />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request to Leave Pod</DialogTitle>
            <DialogDescription>
              Submit a request to leave this pod. Your request will be reviewed by the pod leader.
              You can only leave at the end of the current billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leave-reason">Reason for leaving (optional)</Label>
              <Textarea
                id="leave-reason"
                placeholder="Please share why you'd like to leave this pod..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-leave-reason"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> If approved, you will remain a member until the end of the current billing cycle 
                plus the pod's configured exit timeline (typically 30 days).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLeaveDialogOpen(false);
                setLeaveReason("");
                setSelectedPodForLeave(null);
              }}
              data-testid="button-cancel-leave"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPodForLeave) {
                  leaveRequestMutation.mutate({ 
                    podId: selectedPodForLeave, 
                    reason: leaveReason 
                  });
                }
              }}
              disabled={leaveRequestMutation.isPending}
              data-testid="button-submit-leave-request"
            >
              {leaveRequestMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}