import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
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
  Mail,
  Phone,
  LogOut,
  Trash2
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
  podName?: string;
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
  const [selectedRequest, setSelectedRequest] = useState<JoinRequestWithUser | null>(null);
  const [selectedMember, setSelectedMember] = useState<PodMemberWithUser | null>(null);
  const [selectedPodForMembers, setSelectedPodForMembers] = useState<number | null>(null);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editClubName, setEditClubName] = useState("");
  const [editClubRegion, setEditClubRegion] = useState("");
  const [editClubAddress, setEditClubAddress] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editCostPerPerson, setEditCostPerPerson] = useState<number>(0);
  const [editTotalSpots, setEditTotalSpots] = useState<number>(0);
  const [editAvailableSpots, setEditAvailableSpots] = useState<number>(0);
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [deletingPod, setDeletingPod] = useState<Pod | null>(null);

  // Fetch authenticated user with all profile data from database
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

  // Fetch pods where user is the leader
  const { data: leaderPods, isLoading: podsLoading } = useQuery<Pod[]>({
    queryKey: ['/api/pods', 'leader', authUser?.id],
    queryFn: async () => {
      const response = await fetch('/api/pods');
      if (!response.ok) throw new Error('Failed to fetch pods');
      const allPods = await response.json();
      // Filter pods where current user is the leader
      return allPods.filter((pod: Pod) => pod.leadId === authUser?.id);
    },
    enabled: !!authUser?.id,
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

  // Mutation to update pod
  const updatePodMutation = useMutation({
    mutationFn: async ({ podId, updates }: { 
      podId: number; 
      updates: { 
        title?: string; 
        description?: string; 
        clubName?: string; 
        clubRegion?: string; 
        clubAddress?: string;
        imageUrl?: string; 
        costPerPerson?: number; 
        totalSpots?: number;
        availableSpots?: number;
        amenities?: string[];
      } 
    }) => {
      const response = await fetch(`/api/pods/${podId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update pod');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pod updated",
        description: "Your pod details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests', 'leader'] });
      setEditingPod(null);
      setEditTitle("");
      setEditDescription("");
      setEditClubName("");
      setEditClubRegion("");
      setEditClubAddress("");
      setEditImageUrl("");
      setEditCostPerPerson(0);
      setEditTotalSpots(0);
      setEditAvailableSpots(0);
      setEditAmenities([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pod. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete pod
  const deletePodMutation = useMutation({
    mutationFn: async (podId: number) => {
      const response = await fetch(`/api/pods/${podId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete pod');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pod deleted",
        description: "Your pod has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/join-requests', 'leader'] });
      if (deletingPod?.id === selectedPodForMembers) {
        setSelectedPodForMembers(null);
      }
      setDeletingPod(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting pod",
        description: error.message || "Failed to delete pod. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRequestAction = (requestId: number, status: 'accepted' | 'rejected') => {
    updateRequestMutation.mutate({ requestId, status });
  };

  const handleEditPod = (pod: Pod) => {
    setEditingPod(pod);
    setEditTitle(pod.title || "");
    setEditDescription(pod.description || "");
    setEditClubName(pod.clubName || "");
    setEditClubRegion(pod.clubRegion || "");
    setEditClubAddress(pod.clubAddress || "");
    setEditImageUrl(pod.imageUrl || "");
    setEditCostPerPerson(pod.costPerPerson);
    setEditTotalSpots(pod.totalSpots);
    setEditAvailableSpots(pod.availableSpots || 0);
    setEditAmenities(pod.amenities || []);
  };

  const handleSavePod = () => {
    if (!editingPod) return;

    // Validate required text fields
    if (!editTitle.trim()) {
      toast({
        title: "Invalid title",
        description: "Please enter a pod title.",
        variant: "destructive",
      });
      return;
    }

    if (!editDescription.trim()) {
      toast({
        title: "Invalid description",
        description: "Please enter a pod description.",
        variant: "destructive",
      });
      return;
    }

    if (!editClubName.trim()) {
      toast({
        title: "Invalid club name",
        description: "Please enter the club name.",
        variant: "destructive",
      });
      return;
    }

    if (!editClubRegion.trim()) {
      toast({
        title: "Invalid region",
        description: "Please enter the club region.",
        variant: "destructive",
      });
      return;
    }

    if (!editClubAddress.trim()) {
      toast({
        title: "Invalid address",
        description: "Please enter the club address.",
        variant: "destructive",
      });
      return;
    }

    // Validate numeric fields
    if (!Number.isFinite(editCostPerPerson) || editCostPerPerson <= 0) {
      toast({
        title: "Invalid cost",
        description: "Please enter a valid cost per person greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(editTotalSpots) || editTotalSpots <= 0) {
      toast({
        title: "Invalid total spots",
        description: "Please enter a valid number of total spots (at least 1).",
        variant: "destructive",
      });
      return;
    }

    if (editTotalSpots > 8) {
      toast({
        title: "Invalid total spots",
        description: "Total spots cannot exceed 8 members.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(editAvailableSpots) || editAvailableSpots < 0) {
      toast({
        title: "Invalid available spots",
        description: "Please enter a valid number of available spots (0 or more).",
        variant: "destructive",
      });
      return;
    }

    if (editAvailableSpots > editTotalSpots) {
      toast({
        title: "Invalid spots",
        description: `Available spots cannot exceed total spots (${editTotalSpots}).`,
        variant: "destructive",
      });
      return;
    }

    // Check if reducing total spots would affect existing members
    const currentMembers = editingPod.totalSpots - editingPod.availableSpots;
    if (editTotalSpots < currentMembers) {
      toast({
        title: "Cannot reduce total spots",
        description: `You have ${currentMembers} current members. Total spots must be at least ${currentMembers}.`,
        variant: "destructive",
      });
      return;
    }

    updatePodMutation.mutate({ 
      podId: editingPod.id, 
      updates: {
        title: editTitle.trim(),
        description: editDescription.trim(),
        clubName: editClubName.trim(),
        clubRegion: editClubRegion.trim(),
        clubAddress: editClubAddress.trim(),
        imageUrl: editImageUrl.trim(),
        costPerPerson: editCostPerPerson,
        totalSpots: editTotalSpots,
        availableSpots: editAvailableSpots,
        amenities: editAmenities
      }
    });
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
  const totalMembers = leaderPods?.reduce((sum, pod) => sum + (pod.availableSpots || 0), 0) || 0;

  // Show loading state while fetching user data from database
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
      <Navigation userType="pod_leader" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                                  Submitted: {request.createdAt ? formatDate(request.createdAt.toString()) : 'Unknown'}
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
                                        Joined {member.joinedAt ? formatDate(member.joinedAt.toString()) : 'Unknown'}
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
                                            <span>{selectedMember.joinedAt ? formatDate(selectedMember.joinedAt.toString()) : 'Unknown'}</span>
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
                                  <Badge variant="outline">{pod.clubRegion}</Badge>
                                  <Badge variant={(pod.availableSpots || 0) > 0 ? "default" : "secondary"}>
                                    {(pod.availableSpots || 0) > 0 ? "Open" : "Full"}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{pod.clubAddress}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="w-4 h-4" />
                                    <span>${pod.costPerPerson}/month</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{pod.totalSpots - (pod.availableSpots || 0)}/{pod.totalSpots}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{pod.description}</p>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/pod/${pod.id}`)}
                                  data-testid={`button-view-pod-${pod.id}`}
                                >
                                  View Details
                                </Button>
                                <Dialog open={editingPod?.id === pod.id} onOpenChange={(open) => !open && setEditingPod(null)}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleEditPod(pod)}
                                      data-testid={`button-edit-pod-${pod.id}`}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Edit Pod Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <label htmlFor="podTitle" className="block text-sm font-medium text-gray-700 mb-2">
                                          Pod Title *
                                        </label>
                                        <input
                                          id="podTitle"
                                          type="text"
                                          placeholder="Downtown Fitness Group"
                                          value={editTitle}
                                          onChange={(e) => setEditTitle(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          data-testid="input-pod-title"
                                        />
                                      </div>

                                      <div>
                                        <label htmlFor="podDescription" className="block text-sm font-medium text-gray-700 mb-2">
                                          Description *
                                        </label>
                                        <textarea
                                          id="podDescription"
                                          rows={3}
                                          placeholder="Describe your pod..."
                                          value={editDescription}
                                          onChange={(e) => setEditDescription(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          data-testid="input-pod-description"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-2">
                                            Club Name *
                                          </label>
                                          <input
                                            id="clubName"
                                            type="text"
                                            placeholder="Bay Club Courtside"
                                            value={editClubName}
                                            onChange={(e) => setEditClubName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            data-testid="input-club-name"
                                          />
                                        </div>

                                        <div>
                                          <label htmlFor="clubRegion" className="block text-sm font-medium text-gray-700 mb-2">
                                            Region *
                                          </label>
                                          <input
                                            id="clubRegion"
                                            type="text"
                                            placeholder="San Jose"
                                            value={editClubRegion}
                                            onChange={(e) => setEditClubRegion(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            data-testid="input-club-region"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label htmlFor="clubAddress" className="block text-sm font-medium text-gray-700 mb-2">
                                          Club Address *
                                        </label>
                                        <input
                                          id="clubAddress"
                                          type="text"
                                          placeholder="5252 Prospect Rd, San Jose, CA 95129"
                                          value={editClubAddress}
                                          onChange={(e) => setEditClubAddress(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          data-testid="input-club-address"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label htmlFor="costPerPerson" className="block text-sm font-medium text-gray-700 mb-2">
                                            Cost Per Person ($/month) *
                                          </label>
                                          <input
                                            id="costPerPerson"
                                            type="number"
                                            min="0"
                                            placeholder="250"
                                            value={editCostPerPerson || ''}
                                            onChange={(e) => setEditCostPerPerson(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            data-testid="input-pod-cost"
                                          />
                                        </div>

                                        <div>
                                          <label htmlFor="totalSpots" className="block text-sm font-medium text-gray-700 mb-2">
                                            Total Spots *
                                          </label>
                                          <input
                                            id="totalSpots"
                                            type="number"
                                            min="1"
                                            max="8"
                                            placeholder="5"
                                            value={editTotalSpots || ''}
                                            onChange={(e) => setEditTotalSpots(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            data-testid="input-total-spots"
                                          />
                                          <p className="text-xs text-gray-500 mt-1">Maximum 8 members</p>
                                        </div>
                                      </div>

                                      <div>
                                        <label htmlFor="availableSpots" className="block text-sm font-medium text-gray-700 mb-2">
                                          Available Spots *
                                        </label>
                                        <input
                                          id="availableSpots"
                                          type="number"
                                          min="0"
                                          max={editTotalSpots || 10}
                                          placeholder="2"
                                          value={editAvailableSpots || ''}
                                          onChange={(e) => setEditAvailableSpots(parseInt(e.target.value))}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          data-testid="input-pod-spots"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                          Number of spots currently available (max: {editTotalSpots})
                                        </p>
                                      </div>

                                      <div>
                                        <label htmlFor="amenities" className="block text-sm font-medium text-gray-700 mb-2">
                                          Amenities
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {['tennis', 'pickleball', 'pool', 'spa', 'fitness', 'basketball', 'yoga'].map((amenity) => (
                                            <label key={amenity} className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200">
                                              <input
                                                type="checkbox"
                                                checked={editAmenities.includes(amenity)}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setEditAmenities([...editAmenities, amenity]);
                                                  } else {
                                                    setEditAmenities(editAmenities.filter(a => a !== amenity));
                                                  }
                                                }}
                                                className="rounded text-purple-600 focus:ring-purple-500"
                                                data-testid={`checkbox-amenity-${amenity}`}
                                              />
                                              <span className="text-sm capitalize">{amenity}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      <div>
                                        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                          Image URL
                                        </label>
                                        <input
                                          id="imageUrl"
                                          type="text"
                                          placeholder="https://example.com/image.jpg"
                                          value={editImageUrl}
                                          onChange={(e) => setEditImageUrl(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          data-testid="input-pod-image-url"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                          Enter a URL to an image for your pod (e.g., from Unsplash, Imgur, etc.)
                                        </p>
                                      </div>
                                      {editImageUrl && (
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Preview
                                          </label>
                                          <img 
                                            src={editImageUrl} 
                                            alt="Pod preview" 
                                            className="w-full h-48 object-cover rounded-lg"
                                            onError={(e) => {
                                              e.currentTarget.src = "https://via.placeholder.com/400x300?text=Invalid+Image+URL";
                                            }}
                                          />
                                        </div>
                                      )}
                                      <div className="flex justify-end space-x-2 pt-4 border-t">
                                        <Button 
                                          variant="outline" 
                                          onClick={() => setEditingPod(null)}
                                          data-testid="button-cancel-edit"
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          onClick={handleSavePod}
                                          disabled={updatePodMutation.isPending}
                                          data-testid="button-save-pod"
                                        >
                                          {updatePodMutation.isPending ? "Saving..." : "Save Changes"}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Dialog open={deletingPod?.id === pod.id} onOpenChange={(open) => !open && setDeletingPod(null)}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => setDeletingPod(pod)}
                                      data-testid={`button-delete-pod-${pod.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Pod</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                          <div>
                                            <h4 className="text-sm font-semibold text-red-800 mb-1">Warning: This action cannot be undone</h4>
                                            <p className="text-sm text-red-700">
                                              Deleting this pod will permanently remove:
                                            </p>
                                            <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
                                              <li>The pod and all its details</li>
                                              <li>All current members</li>
                                              <li>All pending join requests</li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        Are you sure you want to delete <strong>{pod.clubName}</strong>?
                                      </p>
                                      <div className="flex justify-end space-x-2">
                                        <Button 
                                          variant="outline" 
                                          onClick={() => setDeletingPod(null)}
                                          disabled={deletePodMutation.isPending}
                                          data-testid="button-cancel-delete"
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          variant="destructive"
                                          onClick={() => deletePodMutation.mutate(pod.id)}
                                          disabled={deletePodMutation.isPending}
                                          data-testid="button-confirm-delete"
                                        >
                                          {deletePodMutation.isPending ? "Deleting..." : "Delete Pod"}
                                        </Button>
                                      </div>
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
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}