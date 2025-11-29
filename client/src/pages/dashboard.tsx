import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  DollarSign,
  Phone,
  Mail,
  Edit3,
  Zap,
  MailWarning,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import type { Pod, JoinRequest } from "@shared/schema";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primaryCampus: string;
  primaryClub: string;
  membershipLevel: string;
  membershipId: string;
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

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPodForMembers, setSelectedPodForMembers] = useState<number | null>(null);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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
                  <span className="truncate">{userData.phone}</span>
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
                    <div className="text-xl sm:text-2xl font-bold text-pink-600">{joinRequests?.length || 0}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Total Requests</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11">
                <TabsTrigger value="requests" className="text-sm sm:text-base" data-testid="tab-join-requests">Join Requests</TabsTrigger>
                <TabsTrigger value="members" className="text-sm sm:text-base" data-testid="tab-pod-members">Pod Members</TabsTrigger>
                <TabsTrigger value="pods" className="text-sm sm:text-base" data-testid="tab-my-pods">My Pods</TabsTrigger>
              </TabsList>

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
                        {activePods.map((pod) => (
                          <div key={pod.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
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
                                    <span>${(pod.costPerPerson / 100)}/month</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{pod.description}</p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/pod/${pod.id}`)}
                                className="w-full sm:w-auto sm:ml-4 flex-shrink-0"
                                data-testid={`button-view-pod-${pod.id}`}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
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
                                  {pod && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => navigate(`/pod/${pod.id}`)}
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
                                    {member.userEmail && (
                                      <p className="text-sm text-gray-600 truncate">{member.userEmail}</p>
                                    )}
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
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}