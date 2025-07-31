import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Edit3,
  Zap,
  UserCheck,
  UserX,
  TrendingUp,
  Mail,
  Phone,
  LogOut
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Pod, JoinRequest, PodMember } from "@shared/schema";

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

interface JoinRequestWithUser extends JoinRequest {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

interface PodMemberWithUser extends PodMember {
  user: UserData | null;
}

export default function PodLeaderDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequestWithUser | null>(null);
  const [selectedMember, setSelectedMember] = useState<PodMemberWithUser | null>(null);
  const [selectedPodForMembers, setSelectedPodForMembers] = useState<number | null>(null);

  // Load user data from localStorage
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('userData');
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, []);

  // Fetch pods where user is the leader
  const { data: leaderPods, isLoading: podsLoading } = useQuery<Pod[]>({
    queryKey: ['/api/pods', 'leader', 1], // Mock user ID
    queryFn: async () => {
      const response = await fetch('/api/pods');
      if (!response.ok) throw new Error('Failed to fetch pods');
      const allPods = await response.json();
      // Filter pods where current user is the leader
      return allPods.filter((pod: Pod) => pod.leadId === 1); // Mock filter
    },
  });

  // Fetch join requests for leader's pods
  const { data: allJoinRequests, isLoading: requestsLoading } = useQuery<JoinRequestWithUser[]>({
    queryKey: ['/api/join-requests', 'leader'],
    queryFn: async () => {
      if (!leaderPods || leaderPods.length === 0) return [];
      
      const requests = await Promise.all(
        leaderPods.map(async (pod) => {
          const response = await fetch(`/api/pods/${pod.id}/join-requests`);
          if (!response.ok) throw new Error('Failed to fetch join requests');
          const podRequests = await response.json();
          return podRequests.map((req: JoinRequest) => ({
            ...req,
            podName: pod.clubName,
            userName: req.userInfo?.name || 'Unknown User',
            userEmail: req.userInfo?.email || '',
            userPhone: req.userInfo?.phone || ''
          }));
        })
      );
      
      return requests.flat();
    },
    enabled: !!leaderPods && leaderPods.length > 0,
  });

  // Fetch pod members for a specific pod
  const { data: podMembers, isLoading: membersLoading } = useQuery<PodMemberWithUser[]>({
    queryKey: ['/api/pods', selectedPodForMembers, 'members'],
    queryFn: async () => {
      if (!selectedPodForMembers) return [];
      const response = await fetch(`/api/pods/${selectedPodForMembers}/members`);
      if (!response.ok) throw new Error('Failed to fetch pod members');
      return response.json();
    },
    enabled: !!selectedPodForMembers
  });

  // Mutation to update join request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: 'accepted' | 'rejected' }) => {
      const response = await fetch(`/api/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update join request');
      return response.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: `Request ${status}`,
        description: `The join request has been ${status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests', 'leader'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pods'] });
      setSelectedRequest(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update join request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRequestAction = (requestId: number, status: 'accepted' | 'rejected') => {
    updateRequestMutation.mutate({ requestId, status });
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const pendingRequests = allJoinRequests?.filter(req => req.status === 'pending') || [];
  const totalMembers = leaderPods?.reduce((sum, pod) => sum + (pod.maxMembers - pod.availableSpots), 0) || 0;
  const totalRevenue = leaderPods?.reduce((sum, pod) => sum + (pod.monthlyFee * (pod.maxMembers - pod.availableSpots)), 0) || 0;

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Dashboard</CardTitle>
            <p className="text-muted-foreground">Complete your profile to access your dashboard</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/pod-leader-registration')} className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Manage your pods and members</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => navigate('/pods')} variant="outline">
                Browse Pods
              </Button>
              <Button onClick={() => navigate('/pod-leader-registration')} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Create New Pod
              </Button>
              <a href="/api/logout">
                <Button variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Pods</p>
                    <p className="text-2xl font-bold text-gray-900">{leaderPods?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${totalRevenue}</p>
                  </div>
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-pink-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg">
                      {getUserInitials(userData.firstName, userData.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{userData.firstName} {userData.lastName}</h2>
                    <p className="text-gray-600">Pod Leader</p>
                    <Badge variant="outline" className="mt-1">{userData.membershipLevel}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{userData.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{userData.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{userData.primaryClub}</span>
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="requests">
                  Join Requests
                  {pendingRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="members">Pod Members</TabsTrigger>
                <TabsTrigger value="pods">My Pods</TabsTrigger>
              </TabsList>

              <TabsContent value="requests" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Join Requests</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {requestsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading requests...</p>
                      </div>
                    ) : !allJoinRequests || allJoinRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Join Requests</h3>
                        <p className="text-gray-600">No one has requested to join your pods yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {allJoinRequests.map((request) => (
                          <div key={request.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">{request.userName}</h3>
                                  <Badge className={getStatusColor(request.status)}>
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(request.status)}
                                      <span className="capitalize">{request.status}</span>
                                    </div>
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Wants to join: <strong>{request.podName}</strong>
                                </p>
                                <p className="text-sm text-gray-600">
                                  Submitted: {formatDate(request.createdAt)}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Join Request Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">Applicant Information</h4>
                                        <div className="space-y-2 text-sm">
                                          <p><strong>Name:</strong> {request.userName}</p>
                                          <p><strong>Email:</strong> {request.userEmail}</p>
                                          <p><strong>Phone:</strong> {request.userPhone}</p>
                                        </div>
                                      </div>
                                      {request.message && (
                                        <div>
                                          <h4 className="font-semibold mb-2">Message</h4>
                                          <p className="text-sm bg-gray-50 p-3 rounded-md">{request.message}</p>
                                        </div>
                                      )}
                                      {request.status === 'pending' && (
                                        <div className="flex space-x-2 pt-4">
                                          <Button
                                            onClick={() => handleRequestAction(request.id, 'accepted')}
                                            disabled={updateRequestMutation.isPending}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                          >
                                            <UserCheck className="w-4 h-4 mr-2" />
                                            Accept
                                          </Button>
                                          <Button
                                            onClick={() => handleRequestAction(request.id, 'rejected')}
                                            disabled={updateRequestMutation.isPending}
                                            variant="destructive"
                                            className="flex-1"
                                          >
                                            <UserX className="w-4 h-4 mr-2" />
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="members" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Pod Members</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!leaderPods || leaderPods.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pods Created</h3>
                        <p className="text-gray-600">Create a pod first to see members</p>
                      </div>
                    ) : !selectedPodForMembers ? (
                      <div className="space-y-4">
                        <p className="text-gray-600 mb-4">Select a pod to view its members:</p>
                        <div className="grid grid-cols-1 gap-3">
                          {leaderPods.map((pod) => (
                            <div
                              key={pod.id}
                              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => setSelectedPodForMembers(pod.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-semibold">{pod.clubName}</h4>
                                  <p className="text-sm text-gray-600">{pod.clubRegion}</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                                    <Users className="w-4 h-4" />
                                    <span>{(pod.totalSpots || pod.maxMembers || 0) - pod.availableSpots} members</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">
                              {leaderPods?.find(p => p.id === selectedPodForMembers)?.clubName} Members
                            </h4>
                            <p className="text-sm text-gray-600">
                              {leaderPods?.find(p => p.id === selectedPodForMembers)?.clubRegion}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPodForMembers(null)}
                          >
                            Back to Pods
                          </Button>
                        </div>

                        {membersLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto loading-spin"></div>
                            <p className="text-gray-600 mt-2">Loading members...</p>
                          </div>
                        ) : !podMembers || podMembers.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Yet</h3>
                            <p className="text-gray-600">This pod doesn't have any members yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {podMembers.map((member) => (
                              <div
                                key={member.id}
                                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedMember(member)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="w-10 h-10">
                                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                        {member.user ? getUserInitials(member.user.firstName, member.user.lastName) : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h4 className="font-semibold">
                                        {member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User'}
                                      </h4>
                                      <p className="text-sm text-gray-600">
                                        {member.user?.email || 'No email'}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        Joined {formatDate(member.joinedAt)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="outline" className="mb-1">
                                      {member.userId === leaderPods?.find(p => p.id === selectedPodForMembers)?.leadId ? 'Leader' : 'Member'}
                                    </Badge>
                                    <div className="text-sm text-gray-600">
                                      {member.user?.membershipId || 'No membership ID'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Member Details Modal */}
                            <Dialog open={selectedMember !== null} onOpenChange={() => setSelectedMember(null)}>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Member Details</DialogTitle>
                                </DialogHeader>
                                {selectedMember && (
                                  <div className="space-y-4">
                                    <div className="flex items-center space-x-4">
                                      <Avatar className="w-16 h-16">
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg">
                                          {selectedMember.user ? getUserInitials(selectedMember.user.firstName, selectedMember.user.lastName) : 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h3 className="text-xl font-semibold">
                                          {selectedMember.user ? `${selectedMember.user.firstName} ${selectedMember.user.lastName}` : 'Unknown User'}
                                        </h3>
                                        <Badge variant="outline" className="mt-1">
                                          {selectedMember.userId === leaderPods?.find(p => p.id === selectedPodForMembers)?.leadId ? 'Pod Leader' : 'Member'}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">Contact Information</h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex items-center space-x-2">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            <span>{selectedMember.user?.email || 'No email'}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 text-gray-500" />
                                            <span>{selectedMember.user?.phone || 'No phone'}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="font-semibold mb-2">Membership Details</h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex items-center space-x-2">
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            <span>{selectedMember.user?.primaryClub || 'No primary club'}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-gray-500" />
                                            <span>{selectedMember.user?.membershipLevel || 'No membership level'}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <UserCheck className="w-4 h-4 text-gray-500" />
                                            <span>{selectedMember.user?.membershipId || 'No membership ID'}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="font-semibold mb-2">Pod Activity</h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span>Joined Date:</span>
                                            <span>{formatDate(selectedMember.joinedAt)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Status:</span>
                                            <Badge variant="outline" className="text-xs">
                                              {selectedMember.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pods" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>My Pods</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {podsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading pods...</p>
                      </div>
                    ) : !leaderPods || leaderPods.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pods Created</h3>
                        <p className="text-gray-600 mb-4">You haven't created any pods yet</p>
                        <Button onClick={() => navigate('/pod-leader-registration')}>
                          Create Your First Pod
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {leaderPods.map((pod) => (
                          <div key={pod.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">{pod.clubName}</h3>
                                  <Badge variant="outline">{pod.region}</Badge>
                                  <Badge variant={pod.availableSpots > 0 ? "default" : "secondary"}>
                                    {pod.availableSpots > 0 ? "Open" : "Full"}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{pod.location}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>${pod.monthlyFee}/month</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{pod.maxMembers - pod.availableSpots}/{pod.maxMembers}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{pod.description}</p>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/pod/${pod.id}`)}
                                >
                                  View Details
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
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