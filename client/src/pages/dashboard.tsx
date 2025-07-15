import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Zap
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

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);

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

  // Fetch user's join requests
  const { data: joinRequests, isLoading: requestsLoading } = useQuery<JoinRequest[]>({
    queryKey: ['/api/join-requests', 'user', 1], // Mock user ID
    queryFn: async () => {
      const response = await fetch('/api/join-requests/user/1');
      if (!response.ok) throw new Error('Failed to fetch join requests');
      return response.json();
    },
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

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Welcome to FlexPod</CardTitle>
            <p className="text-muted-foreground">Complete your profile to access your dashboard</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/user-type-selection')} className="w-full">
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
                <h1 className="text-2xl font-bold text-gray-900">FlexPod</h1>
                <p className="text-gray-600">Your Account</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => navigate('/pods')} variant="outline">
                Browse Pods
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
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
                    <p className="text-gray-600">{userData.membershipLevel}</p>
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
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{userData.primaryCampus} Campus</span>
                </div>
                <Separator />
                <Button variant="outline" size="sm" className="w-full">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{activePods.length}</div>
                    <div className="text-sm text-gray-600">Active Pods</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">{joinRequests?.length || 0}</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="pods" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pods">My Pods</TabsTrigger>
                <TabsTrigger value="requests">Join Requests</TabsTrigger>
              </TabsList>

              <TabsContent value="pods" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Active Pod Memberships</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activePods.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Pods</h3>
                        <p className="text-gray-600 mb-4">You haven't joined any pods yet</p>
                        <Button onClick={() => navigate('/pods')}>Browse Available Pods</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activePods.map((pod) => (
                          <div key={pod.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">{pod.clubName}</h3>
                                  <Badge variant="outline">{pod.region}</Badge>
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
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{pod.description}</p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/pod/${pod.id}`)}
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

              <TabsContent value="requests" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Join Request History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {requestsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading requests...</p>
                      </div>
                    ) : !joinRequests || joinRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Join Requests</h3>
                        <p className="text-gray-600 mb-4">You haven't requested to join any pods yet</p>
                        <Button onClick={() => navigate('/pods')}>Browse Available Pods</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {joinRequests.map((request) => {
                          const pod = allPods?.find(p => p.id === request.podId);
                          return (
                            <div key={request.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg">{pod?.clubName || 'Unknown Pod'}</h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Badge className={getStatusColor(request.status)}>
                                      <div className="flex items-center space-x-1">
                                        {getStatusIcon(request.status)}
                                        <span className="capitalize">{request.status}</span>
                                      </div>
                                    </Badge>
                                    <span className="text-sm text-gray-600">
                                      {formatDate(request.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                {pod && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => navigate(`/pod/${pod.id}`)}
                                  >
                                    View Pod
                                  </Button>
                                )}
                              </div>
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
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}