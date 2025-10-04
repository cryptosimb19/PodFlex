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

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/');
    }
  };

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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FlexPod</h1>
                <p className="text-sm sm:text-base text-gray-600">Your Account</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button 
                onClick={() => navigate('/pods')} 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
                data-testid="button-browse-pods"
              >
                Browse Pods
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline" 
                size="sm" 
                className="w-full sm:w-auto" 
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

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
                <Button variant="outline" size="sm" className="w-full" data-testid="button-edit-profile">
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
            <Tabs defaultValue="pods" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
                <TabsTrigger value="pods" className="text-sm sm:text-base">My Pods</TabsTrigger>
                <TabsTrigger value="requests" className="text-sm sm:text-base">Join Requests</TabsTrigger>
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
                                    <span className="text-xs sm:text-sm text-gray-600">
                                      {formatDate(request.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                {pod && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => navigate(`/pod/${pod.id}`)}
                                    className="w-full sm:w-auto sm:ml-4 flex-shrink-0"
                                    data-testid={`button-view-request-pod-${pod.id}`}
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