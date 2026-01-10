import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  UserMinus,
  Mail,
  Phone,
  LogOut,
  Trash2,
  User,
  ArrowRight,
  ImageIcon,
  X,
  Settings,
  Percent,
  Save,
  Shield,
  ShieldCheck,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import type { Pod, JoinRequest, PodMember, LeaveRequest } from "@shared/schema";

// Phone number formatting utility
const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");

  // Format based on length
  if (digits.length === 0) return "";
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

interface LeaveRequestWithDetails extends LeaveRequest {
  userName?: string;
  userEmail?: string;
  podName?: string;
}

export default function PodLeaderDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<JoinRequestWithUser | null>(null);
  const [selectedLeaveRequest, setSelectedLeaveRequest] =
    useState<LeaveRequestWithDetails | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<PodMemberWithUser | null>(null);
  const [selectedPodForMembers, setSelectedPodForMembers] = useState<
    number | null
  >(null);
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
  const [exitTimelineDays, setExitTimelineDays] = useState<number>(30);
  const [isEditingExitTimeline, setIsEditingExitTimeline] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [verifyingRequest, setVerifyingRequest] = useState<JoinRequestWithUser | null>(null);
  const [bayClubEmail, setBayClubEmail] = useState("");
  const [membershipIdInput, setMembershipIdInput] = useState("");

  // Image upload hook for editing pods
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setEditImageUrl(response.objectPath);
      toast({
        title: "Image uploaded",
        description: "Your pod image has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description:
          error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      await uploadFile(file);
    }
  };

  const removeEditImage = () => {
    setEditImageUrl("");
  };

  // Fetch authenticated user with all profile data from database
  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Map authenticated user data to userData format
  const userData: UserData | null = authUser
    ? {
        firstName: authUser.firstName || "",
        lastName: authUser.lastName || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
        primaryCampus: authUser.preferredRegion || "",
        primaryClub: authUser.primaryClub || "",
        membershipLevel: authUser.membershipLevel || "",
        membershipId: authUser.membershipId || "",
      }
    : null;

  // Fetch pods where user is the leader
  const { data: leaderPods, isLoading: podsLoading } = useQuery<Pod[]>({
    queryKey: ["/api/pods", "leader", authUser?.id],
    queryFn: async () => {
      const response = await fetch("/api/pods");
      if (!response.ok) throw new Error("Failed to fetch pods");
      const allPods = await response.json();
      // Filter pods where current user is the leader
      return allPods.filter((pod: Pod) => pod.leadId === authUser?.id);
    },
    enabled: !!authUser?.id,
  });

  // Fetch join requests for leader's pods
  const { data: allJoinRequests, isLoading: requestsLoading } = useQuery<
    JoinRequestWithUser[]
  >({
    queryKey: ["/api/join-requests", "leader"],
    queryFn: async () => {
      if (!leaderPods || leaderPods.length === 0) return [];

      const requests = await Promise.all(
        leaderPods.map(async (pod) => {
          const response = await fetch(`/api/pods/${pod.id}/join-requests`);
          if (!response.ok) throw new Error("Failed to fetch join requests");
          const podRequests = await response.json();
          return podRequests.map((req: JoinRequest) => ({
            ...req,
            podName: pod.clubName,
            userName: req.userInfo?.name || "Unknown User",
            userEmail: req.userInfo?.email || "",
            userPhone: req.userInfo?.phone || "",
          }));
        }),
      );

      return requests.flat();
    },
    enabled: !!leaderPods && leaderPods.length > 0,
  });

  // Fetch pod members for a specific pod
  const { data: podMembers, isLoading: membersLoading } = useQuery<
    PodMemberWithUser[]
  >({
    queryKey: ["/api/pods", selectedPodForMembers, "members"],
    queryFn: async () => {
      if (!selectedPodForMembers) return [];
      const response = await fetch(
        `/api/pods/${selectedPodForMembers}/members`,
      );
      if (!response.ok) throw new Error("Failed to fetch pod members");
      return response.json();
    },
    enabled: !!selectedPodForMembers,
  });

  // Fetch leave requests for leader's pods
  const { data: allLeaveRequests, isLoading: leaveRequestsLoading } = useQuery<
    LeaveRequestWithDetails[]
  >({
    queryKey: ["/api/leave-requests", "leader"],
    queryFn: async () => {
      if (!leaderPods || leaderPods.length === 0) return [];

      const requests = await Promise.all(
        leaderPods.map(async (pod) => {
          const response = await fetch(`/api/pods/${pod.id}/leave-requests`, {
            credentials: "include",
          });
          if (!response.ok) return [];
          const podRequests = await response.json();
          return podRequests.map((req: LeaveRequest) => ({
            ...req,
            podName: pod.clubName,
            userName: req.userInfo?.name || "Unknown User",
            userEmail: req.userInfo?.email || "",
          }));
        }),
      );

      return requests.flat();
    },
    enabled: !!leaderPods && leaderPods.length > 0,
  });

  // Check if user is also a member of another pod (dual-role support)
  const { data: userJoinRequests } = useQuery({
    queryKey: ["/api/join-requests", "user", authUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/join-requests/user/${authUser?.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!authUser?.id,
  });

  // Check if user has any accepted memberships in other pods
  const acceptedMemberships =
    userJoinRequests?.filter((req: any) => req.status === "accepted") || [];
  const isMemberOfPod = acceptedMemberships.length > 0;

  // Fetch platform settings
  const { data: platformSettings, isLoading: settingsLoading } = useQuery<{
    feePercentage: number;
  }>({
    queryKey: ["/api/settings/platform-fee"],
  });

  // Mutation to update join request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: number;
      status: "accepted" | "rejected";
    }) => {
      const response = await fetch(`/api/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update join request");
      return response.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: `Request ${status}`,
        description: `The join request has been ${status}.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/join-requests", "leader"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pods"] });
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

  // Mutation to update leave request status
  const updateLeaveRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: number;
      action: "approve" | "reject";
    }) => {
      const endpoint =
        action === "approve"
          ? `/api/leave-requests/${requestId}/approve`
          : `/api/leave-requests/${requestId}/reject`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update leave request");
      }
      return response.json();
    },
    onSuccess: (_, { action }) => {
      toast({
        title:
          action === "approve"
            ? "Leave request approved"
            : "Leave request rejected",
        description:
          action === "approve"
            ? "The member has been removed from the pod."
            : "The member will remain in the pod.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/leave-requests", "leader"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pods"] });
      setSelectedLeaveRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to update leave request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLeaveRequestAction = (
    requestId: number,
    action: "approve" | "reject",
  ) => {
    updateLeaveRequestMutation.mutate({ requestId, action });
  };

  // Mutation to send membership verification email
  const verifyMembershipMutation = useMutation({
    mutationFn: async ({
      requestId,
      bayClubEmail,
      membershipId,
    }: {
      requestId: number;
      bayClubEmail: string;
      membershipId: string;
    }) => {
      const response = await fetch(`/api/join-requests/${requestId}/verify-membership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bayClubEmail, membershipId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send verification email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "The membership verification request has been sent to Bay Club.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/join-requests", "leader"],
      });
      setVerificationDialogOpen(false);
      setVerifyingRequest(null);
      setBayClubEmail("");
      setMembershipIdInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to confirm membership verification
  const confirmVerificationMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/join-requests/${requestId}/confirm-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm verification");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification confirmed",
        description: "The member's Bay Club membership has been verified.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/join-requests", "leader"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendVerification = () => {
    if (!verifyingRequest || !bayClubEmail || !membershipIdInput) return;
    verifyMembershipMutation.mutate({
      requestId: verifyingRequest.id,
      bayClubEmail,
      membershipId: membershipIdInput,
    });
  };

  const openVerificationDialog = (request: JoinRequestWithUser) => {
    setVerifyingRequest(request);
    setBayClubEmail("");
    setMembershipIdInput(request.userInfo?.membershipId || "");
    setVerificationDialogOpen(true);
  };

  // State for member removal confirmation
  const [memberToRemove, setMemberToRemove] = useState<{
    podId: number;
    userId: string;
    userName: string;
  } | null>(null);

  // Mutation to remove a pod member
  const removeMemberMutation = useMutation({
    mutationFn: async ({ podId, userId }: { podId: number; userId: string }) => {
      const response = await fetch(`/api/pods/${podId}/members/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove member");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "The member has been removed from the pod and notified by email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pods", selectedPodForMembers, "members"] });
      setMemberToRemove(null);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update pod
  const updatePodMutation = useMutation({
    mutationFn: async ({
      podId,
      updates,
    }: {
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
        exitTimelineDays?: number;
      };
    }) => {
      const response = await fetch(`/api/pods/${podId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update pod");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pod updated",
        description: "Your pod details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pods"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/join-requests", "leader"],
      });
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
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete pod");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pod deleted",
        description: "Your pod has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pods"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/join-requests", "leader"],
      });
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

  const handleRequestAction = (
    requestId: number,
    status: "accepted" | "rejected",
  ) => {
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
        description:
          "Please enter a valid number of available spots (0 or more).",
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
        amenities: editAmenities,
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const pendingRequests =
    allJoinRequests?.filter((req) => req.status === "pending") || [];
  const pendingLeaveRequests =
    allLeaveRequests?.filter((req) => req.status === "pending") || [];
  const totalMembers =
    leaderPods?.reduce((sum, pod) => sum + (pod.totalSpots || 0), 0) || 0;

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
            <p className="text-muted-foreground">
              Please wait while we load your profile...
            </p>
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
                    <p className="text-sm font-medium text-gray-600">
                      Active Pods
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {leaderPods?.length || 0}
                    </p>
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
                    <p className="text-sm font-medium text-gray-600">
                      Total Members
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalMembers}
                    </p>
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
                    <p className="text-sm font-medium text-gray-600">
                      Pending Requests
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {pendingRequests.length}
                    </p>
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
                    {authUser?.profileImageUrl && (
                      <AvatarImage
                        src={authUser.profileImageUrl}
                        alt="Profile"
                        data-testid="img-profile-avatar"
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg">
                      {getUserInitials(userData.firstName, userData.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {userData.firstName} {userData.lastName}
                    </h2>
                    <p className="text-gray-600">Pod Leader</p>
                    <Badge variant="outline" className="mt-1">
                      {userData.membershipLevel}
                    </Badge>
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
                  <span>{formatPhoneNumber(userData.phone)}</span>
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
                  onClick={() => navigate("/edit-profile")}
                  data-testid="button-edit-profile"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Member Dashboard Card - Show if user is also a pod member */}
            {isMemberOfPod && (
              <Card className="mt-4 sm:mt-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span>Pod Member</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      You're also a member of {acceptedMemberships.length} pod
                      {acceptedMemberships.length > 1 ? "s" : ""}.
                    </p>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      data-testid="button-switch-to-member-dashboard"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Switch to Member Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-9 sm:h-11">
                <TabsTrigger
                  value="requests"
                  className="px-1 sm:px-3 text-[10px] sm:text-sm leading-tight"
                  data-testid="tab-join-requests"
                >
                  Join
                  {pendingRequests.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-[9px] px-1 h-4"
                    >
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="leave-requests"
                  className="px-1 sm:px-3 text-[10px] sm:text-sm leading-tight"
                  data-testid="tab-leave-requests"
                >
                  Leave
                  {pendingLeaveRequests.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-[9px] px-1 h-4"
                    >
                      {pendingLeaveRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="px-1 sm:px-3 text-[10px] sm:text-sm leading-tight"
                  data-testid="tab-pod-members"
                >
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="pods"
                  className="px-1 sm:px-3 text-[10px] sm:text-sm leading-tight"
                  data-testid="tab-my-pods"
                >
                  Pods
                </TabsTrigger>
{/* Settings tab hidden for now
                <TabsTrigger
                  value="settings"
                  className="px-1 sm:px-3 text-[10px] sm:text-sm leading-tight"
                  data-testid="tab-settings"
                >
                  Settings
                </TabsTrigger>
*/}
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
                        <p className="text-gray-600 mt-2">
                          Loading requests...
                        </p>
                      </div>
                    ) : !allJoinRequests || allJoinRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Join Requests
                        </h3>
                        <p className="text-gray-600">
                          No one has requested to join your pods yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {allJoinRequests.map((request) => (
                          <div
                            key={request.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">
                                    {request.userName}
                                  </h3>
                                  <Badge
                                    className={getStatusColor(request.status)}
                                  >
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(request.status)}
                                      <span className="capitalize">
                                        {request.status}
                                      </span>
                                    </div>
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Wants to join:{" "}
                                  <strong>{request.podName}</strong>
                                </p>
                                <p className="text-sm text-gray-600">
                                  Submitted:{" "}
                                  {request.createdAt
                                    ? formatDate(request.createdAt.toString())
                                    : "Unknown"}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setSelectedRequest(request)
                                      }
                                    >
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Join Request Details
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">
                                          Applicant Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                          <p>
                                            <strong>Name:</strong>{" "}
                                            {request.userName}
                                          </p>
                                          <p>
                                            <strong>Email:</strong>{" "}
                                            {request.userEmail}
                                          </p>
                                          <p>
                                            <strong>Phone:</strong>{" "}
                                            {request.userPhone}
                                          </p>
                                        </div>
                                      </div>
                                      {request.message && (
                                        <div>
                                          <h4 className="font-semibold mb-2">
                                            Message
                                          </h4>
                                          <p className="text-sm bg-gray-50 p-3 rounded-md">
                                            {request.message}
                                          </p>
                                        </div>
                                      )}
                                      {request.status === "pending" && (
                                        <>
                                          <div className="border-t pt-4">
                                            <h4 className="font-semibold mb-2 flex items-center">
                                              <Shield className="w-4 h-4 mr-2" />
                                              Membership Verification
                                            </h4>
                                            <div className="text-sm">
                                              {request.membershipVerificationStatus === "confirmed" ? (
                                                <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-md">
                                                  <ShieldCheck className="w-5 h-5 mr-2" />
                                                  <span>Membership verified with Bay Club</span>
                                                </div>
                                              ) : request.membershipVerificationStatus === "sent" ? (
                                                <div className="space-y-2">
                                                  <div className="flex items-center text-amber-600 bg-amber-50 p-3 rounded-md">
                                                    <Clock className="w-5 h-5 mr-2" />
                                                    <span>Verification email sent - awaiting confirmation</span>
                                                  </div>
                                                  <Button
                                                    onClick={() => confirmVerificationMutation.mutate(request.id)}
                                                    disabled={confirmVerificationMutation.isPending}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    data-testid={`confirm-verification-${request.id}`}
                                                  >
                                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                                    Mark as Verified
                                                  </Button>
                                                </div>
                                              ) : (
                                                <div className="space-y-2">
                                                  <div className="flex items-center text-gray-600 bg-gray-50 p-3 rounded-md">
                                                    <AlertCircle className="w-5 h-5 mr-2" />
                                                    <span>Membership not yet verified</span>
                                                  </div>
                                                  <Button
                                                    onClick={() => openVerificationDialog(request)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    data-testid={`verify-membership-${request.id}`}
                                                  >
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Verify Membership
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex space-x-2 pt-4">
                                            <Button
                                              onClick={() =>
                                                handleRequestAction(
                                                  request.id,
                                                  "accepted",
                                                )
                                              }
                                              disabled={
                                                updateRequestMutation.isPending
                                              }
                                              className="flex-1 bg-green-600 hover:bg-green-700"
                                            >
                                              <UserCheck className="w-4 h-4 mr-2" />
                                              Accept
                                            </Button>
                                            <Button
                                              onClick={() =>
                                                handleRequestAction(
                                                  request.id,
                                                  "rejected",
                                                )
                                              }
                                              disabled={
                                                updateRequestMutation.isPending
                                              }
                                              variant="destructive"
                                              className="flex-1"
                                            >
                                              <UserX className="w-4 h-4 mr-2" />
                                              Reject
                                            </Button>
                                          </div>
                                        </>
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

              <TabsContent value="leave-requests" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <LogOut className="w-5 h-5" />
                      <span>Leave Requests</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leaveRequestsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">
                          Loading leave requests...
                        </p>
                      </div>
                    ) : !allLeaveRequests || allLeaveRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <LogOut className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Leave Requests
                        </h3>
                        <p className="text-gray-600">
                          No members have requested to leave your pods
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {allLeaveRequests.map((request) => (
                          <div
                            key={request.id}
                            className="border rounded-lg p-4"
                            data-testid={`leave-request-${request.id}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">
                                    {request.userName}
                                  </h3>
                                  <Badge
                                    className={getStatusColor(request.status)}
                                  >
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(request.status)}
                                      <span className="capitalize">
                                        {request.status}
                                      </span>
                                    </div>
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  Wants to leave:{" "}
                                  <strong>{request.podName}</strong>
                                </p>
                                <p className="text-sm text-gray-600">
                                  Submitted:{" "}
                                  {request.createdAt
                                    ? formatDate(request.createdAt.toString())
                                    : "Unknown"}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setSelectedLeaveRequest(request)
                                      }
                                      data-testid={`button-view-leave-request-${request.id}`}
                                    >
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        Leave Request Details
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">
                                          Member Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                          <p>
                                            <strong>Name:</strong>{" "}
                                            {request.userName}
                                          </p>
                                          <p>
                                            <strong>Email:</strong>{" "}
                                            {request.userEmail}
                                          </p>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2">
                                          Pod
                                        </h4>
                                        <p className="text-sm">
                                          {request.podName}
                                        </p>
                                      </div>
                                      {request.reason && (
                                        <div>
                                          <h4 className="font-semibold mb-2">
                                            Reason for Leaving
                                          </h4>
                                          <p className="text-sm bg-gray-50 p-3 rounded-md">
                                            {request.reason}
                                          </p>
                                        </div>
                                      )}
                                      {request.status === "pending" && (
                                        <div className="flex space-x-2 pt-4">
                                          <Button
                                            onClick={() =>
                                              handleLeaveRequestAction(
                                                request.id,
                                                "approve",
                                              )
                                            }
                                            disabled={
                                              updateLeaveRequestMutation.isPending
                                            }
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                            data-testid={`button-approve-leave-${request.id}`}
                                          >
                                            <UserCheck className="w-4 h-4 mr-2" />
                                            Approve
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              handleLeaveRequestAction(
                                                request.id,
                                                "reject",
                                              )
                                            }
                                            disabled={
                                              updateLeaveRequestMutation.isPending
                                            }
                                            variant="destructive"
                                            className="flex-1"
                                            data-testid={`button-reject-leave-${request.id}`}
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Pods Created
                        </h3>
                        <p className="text-gray-600">
                          Create a pod first to see members
                        </p>
                      </div>
                    ) : !selectedPodForMembers ? (
                      <div className="space-y-4">
                        <p className="text-gray-600 mb-4">
                          Select a pod to view its members:
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {leaderPods.map((pod) => (
                            <div
                              key={pod.id}
                              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => setSelectedPodForMembers(pod.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-semibold">
                                    {pod.clubName}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {pod.clubRegion}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                                    <Users className="w-4 h-4" />
                                    <span>
                                      {pod.totalSpots -
                                        (pod.availableSpots || 0)}{" "}
                                      members
                                    </span>
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
                              {
                                leaderPods?.find(
                                  (p) => p.id === selectedPodForMembers,
                                )?.clubName
                              }{" "}
                              Members
                            </h4>
                            <p className="text-sm text-gray-600">
                              {
                                leaderPods?.find(
                                  (p) => p.id === selectedPodForMembers,
                                )?.clubRegion
                              }
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
                            <p className="text-gray-600 mt-2">
                              Loading members...
                            </p>
                          </div>
                        ) : !podMembers || podMembers.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              No Members Yet
                            </h3>
                            <p className="text-gray-600">
                              This pod doesn't have any members yet
                            </p>
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
                                        {member.user
                                          ? getUserInitials(
                                              member.user.firstName,
                                              member.user.lastName,
                                            )
                                          : "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h4 className="font-semibold">
                                        {member.user
                                          ? `${member.user.firstName} ${member.user.lastName}`
                                          : "Unknown User"}
                                      </h4>
                                      <p className="text-sm text-gray-500">
                                        Joined{" "}
                                        {member.joinedAt
                                          ? formatDate(
                                              member.joinedAt.toString(),
                                            )
                                          : "Unknown"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-right">
                                      <Badge variant="outline" className="mb-1">
                                        {member.userId ===
                                        leaderPods?.find(
                                          (p) => p.id === selectedPodForMembers,
                                        )?.leadId
                                          ? "Leader"
                                          : "Member"}
                                      </Badge>
                                      <div className="text-sm text-gray-600">
                                        {member.user?.membershipId ||
                                          "No membership ID"}
                                      </div>
                                    </div>
                                    {member.userId !==
                                      leaderPods?.find(
                                        (p) => p.id === selectedPodForMembers,
                                      )?.leadId && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMemberToRemove({
                                            podId: selectedPodForMembers!,
                                            userId: member.userId,
                                            userName: member.user
                                              ? `${member.user.firstName} ${member.user.lastName}`
                                              : "Unknown User",
                                          });
                                        }}
                                        data-testid={`button-remove-member-${member.id}`}
                                      >
                                        <UserMinus className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Member Details Modal */}
                            <Dialog
                              open={selectedMember !== null}
                              onOpenChange={() => setSelectedMember(null)}
                            >
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Member Details</DialogTitle>
                                </DialogHeader>
                                {selectedMember && (
                                  <div className="space-y-4">
                                    <div className="flex items-center space-x-4">
                                      <Avatar className="w-16 h-16">
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg">
                                          {selectedMember.user
                                            ? getUserInitials(
                                                selectedMember.user.firstName,
                                                selectedMember.user.lastName,
                                              )
                                            : "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h3 className="text-xl font-semibold">
                                          {selectedMember.user
                                            ? `${selectedMember.user.firstName} ${selectedMember.user.lastName}`
                                            : "Unknown User"}
                                        </h3>
                                        <Badge
                                          variant="outline"
                                          className="mt-1"
                                        >
                                          {selectedMember.userId ===
                                          leaderPods?.find(
                                            (p) =>
                                              p.id === selectedPodForMembers,
                                          )?.leadId
                                            ? "Pod Leader"
                                            : "Member"}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">
                                          Contact Information
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex items-center space-x-2">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            <span>
                                              {selectedMember.user?.email ||
                                                "No email"}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 text-gray-500" />
                                            <span>
                                              {selectedMember.user?.phone ||
                                                "No phone"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-semibold mb-2">
                                          Membership Details
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex items-center space-x-2">
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            <span>
                                              {selectedMember.user
                                                ?.primaryClub ||
                                                "No primary club"}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-gray-500" />
                                            <span>
                                              {selectedMember.user
                                                ?.membershipLevel ||
                                                "No membership level"}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <UserCheck className="w-4 h-4 text-gray-500" />
                                            <span>
                                              {selectedMember.user
                                                ?.membershipId ||
                                                "No membership ID"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-semibold mb-2">
                                          Pod Activity
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span>Joined Date:</span>
                                            <span>
                                              {selectedMember.joinedAt
                                                ? formatDate(
                                                    selectedMember.joinedAt.toString(),
                                                  )
                                                : "Unknown"}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>Status:</span>
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {selectedMember.isActive
                                                ? "Active"
                                                : "Inactive"}
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
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No Pods Created
                        </h3>
                        <p className="text-gray-600 mb-4">
                          You haven't created any pods yet
                        </p>
                        <Button
                          onClick={() => navigate("/pod-leader-registration")}
                        >
                          Create Your First Pod
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {leaderPods.map((pod) => (
                          <div
                            key={pod.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-semibold text-lg">
                                    {pod.clubName}
                                  </h3>
                                  <Badge variant="outline">
                                    {pod.clubRegion}
                                  </Badge>
                                  <Badge
                                    variant={
                                      (pod.availableSpots || 0) > 0
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {(pod.availableSpots || 0) > 0
                                      ? "Open"
                                      : "Full"}
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
                                    <span>
                                      {pod.totalSpots -
                                        (pod.availableSpots || 0)}
                                      /{pod.totalSpots}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {pod.description}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/pods/${pod.id}`)}
                                  data-testid={`button-view-pod-${pod.id}`}
                                >
                                  View Details
                                </Button>
                                <Dialog
                                  open={editingPod?.id === pod.id}
                                  onOpenChange={(open) =>
                                    !open && setEditingPod(null)
                                  }
                                >
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
                                      <DialogTitle>
                                        Edit Pod Details
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <label
                                          htmlFor="podTitle"
                                          className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                          Pod Title *
                                        </label>
                                        <Input
                                          id="podTitle"
                                          type="text"
                                          placeholder="Downtown Fitness Group"
                                          value={editTitle}
                                          onChange={(e) =>
                                            setEditTitle(e.target.value)
                                          }
                                          data-testid="input-pod-title"
                                        />
                                      </div>

                                      <div>
                                        <label
                                          htmlFor="podDescription"
                                          className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                          Description *
                                        </label>
                                        <textarea
                                          id="podDescription"
                                          rows={3}
                                          placeholder="Describe your pod..."
                                          value={editDescription}
                                          onChange={(e) =>
                                            setEditDescription(e.target.value)
                                          }
                                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          data-testid="input-pod-description"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label
                                            htmlFor="clubName"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                          >
                                            Club Name *
                                          </label>
                                          <Input
                                            id="clubName"
                                            type="text"
                                            placeholder="Bay Club Courtside"
                                            value={editClubName}
                                            onChange={(e) =>
                                              setEditClubName(e.target.value)
                                            }
                                            data-testid="input-club-name"
                                          />
                                        </div>

                                        <div>
                                          <label
                                            htmlFor="clubRegion"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                          >
                                            Region *
                                          </label>
                                          <Input
                                            id="clubRegion"
                                            type="text"
                                            placeholder="San Jose"
                                            value={editClubRegion}
                                            onChange={(e) =>
                                              setEditClubRegion(e.target.value)
                                            }
                                            data-testid="input-club-region"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label
                                          htmlFor="clubAddress"
                                          className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                          Club Address *
                                        </label>
                                        <Input
                                          id="clubAddress"
                                          type="text"
                                          placeholder="5252 Prospect Rd, San Jose, CA 95129"
                                          value={editClubAddress}
                                          onChange={(e) =>
                                            setEditClubAddress(e.target.value)
                                          }
                                          data-testid="input-club-address"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label
                                            htmlFor="costPerPerson"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                          >
                                            Cost Per Person ($/month) *
                                          </label>
                                          <Input
                                            id="costPerPerson"
                                            type="number"
                                            min="0"
                                            placeholder="250"
                                            value={editCostPerPerson || ""}
                                            onChange={(e) =>
                                              setEditCostPerPerson(
                                                parseInt(e.target.value),
                                              )
                                            }
                                            data-testid="input-pod-cost"
                                          />
                                        </div>

                                        <div>
                                          <label
                                            htmlFor="totalSpots"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                          >
                                            Total Spots *
                                          </label>
                                          <Input
                                            id="totalSpots"
                                            type="number"
                                            min="1"
                                            max="10"
                                            placeholder="5"
                                            value={editTotalSpots || ""}
                                            onChange={(e) =>
                                              setEditTotalSpots(
                                                parseInt(e.target.value),
                                              )
                                            }
                                            data-testid="input-total-spots"
                                          />
                                          <p className="text-xs text-gray-500 mt-1">
                                            Maximum 10 members (including pod
                                            leader)
                                          </p>
                                        </div>
                                      </div>

                                      <div>
                                        <label
                                          htmlFor="availableSpots"
                                          className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                          Available Spots *
                                        </label>
                                        <Input
                                          id="availableSpots"
                                          type="number"
                                          min="0"
                                          max={editTotalSpots || 10}
                                          placeholder="2"
                                          value={editAvailableSpots || ""}
                                          onChange={(e) =>
                                            setEditAvailableSpots(
                                              parseInt(e.target.value),
                                            )
                                          }
                                          data-testid="input-pod-spots"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                          Number of spots currently available
                                          (max: {editTotalSpots})
                                        </p>
                                      </div>

                                      <div>
                                        <label
                                          htmlFor="amenities"
                                          className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                          Amenities
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {[
                                            "tennis",
                                            "pickleball",
                                            "pool",
                                            "spa",
                                            "fitness",
                                            "basketball",
                                            "yoga",
                                          ].map((amenity) => (
                                            <label
                                              key={amenity}
                                              className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={editAmenities.includes(
                                                  amenity,
                                                )}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setEditAmenities([
                                                      ...editAmenities,
                                                      amenity,
                                                    ]);
                                                  } else {
                                                    setEditAmenities(
                                                      editAmenities.filter(
                                                        (a) => a !== amenity,
                                                      ),
                                                    );
                                                  }
                                                }}
                                                className="rounded text-purple-600 focus:ring-purple-500"
                                                data-testid={`checkbox-amenity-${amenity}`}
                                              />
                                              <span className="text-sm capitalize">
                                                {amenity}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          Pod Image (Optional)
                                        </label>
                                        {editImageUrl ? (
                                          <div className="relative">
                                            <img
                                              src={editImageUrl}
                                              alt="Pod preview"
                                              className="w-full h-48 object-cover rounded-lg border"
                                              data-testid="img-edit-pod-preview"
                                            />
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              size="icon"
                                              className="absolute top-2 right-2"
                                              onClick={removeEditImage}
                                              data-testid="button-remove-edit-image"
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="relative">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={handleEditImageUpload}
                                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                              disabled={isUploading}
                                              data-testid="input-edit-pod-image"
                                            />
                                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors">
                                              {isUploading ? (
                                                <div className="flex items-center space-x-2">
                                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
                                                  <span className="text-sm text-gray-600">
                                                    Uploading...
                                                  </span>
                                                </div>
                                              ) : (
                                                <>
                                                  <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                                  <span className="text-sm text-gray-600">
                                                    Click to upload an image
                                                  </span>
                                                  <span className="text-xs text-gray-400 mt-1">
                                                    Max 5MB, JPEG or PNG
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
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
                                          {updatePodMutation.isPending
                                            ? "Saving..."
                                            : "Save Changes"}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Dialog
                                  open={deletingPod?.id === pod.id}
                                  onOpenChange={(open) =>
                                    !open && setDeletingPod(null)
                                  }
                                >
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
                                            <h4 className="text-sm font-semibold text-red-800 mb-1">
                                              Warning: This action cannot be
                                              undone
                                            </h4>
                                            <p className="text-sm text-red-700">
                                              Deleting this pod will permanently
                                              remove:
                                            </p>
                                            <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
                                              <li>
                                                The pod and all its details
                                              </li>
                                              <li>All current members</li>
                                              <li>All pending join requests</li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-600">
                                        Are you sure you want to delete{" "}
                                        <strong>{pod.clubName}</strong>?
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
                                          onClick={() =>
                                            deletePodMutation.mutate(pod.id)
                                          }
                                          disabled={deletePodMutation.isPending}
                                          data-testid="button-confirm-delete"
                                        >
                                          {deletePodMutation.isPending
                                            ? "Deleting..."
                                            : "Delete Pod"}
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

{/* Settings tab hidden for now */}
              {false && <TabsContent value="settings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>Platform Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Platform Fee Setting */}
                      <div className="border rounded-lg p-4 sm:p-6">
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Percent className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              Platform Fee
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Set the percentage fee that FlexPod adds to
                              membership payments. This fee helps cover platform
                              costs and is added on top of the pod membership
                              cost.
                            </p>
                          </div>
                        </div>

                        {settingsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl font-bold text-purple-600">
                                {platformSettings?.feePercentage || 5}%
                              </span>
                              <span className="text-sm text-gray-500">
                                of membership cost
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              Set by platform admin
                            </span>
                          </div>
                        )}

                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            {leaderPods && leaderPods.length > 0
                              ? "Your Pod Payment Breakdown"
                              : "Example Calculation"}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            {leaderPods && leaderPods.length > 0 ? (
                              <>
                                <div className="flex justify-between">
                                  <span>Pod membership cost:</span>
                                  <span>
                                    ${leaderPods[0].costPerPerson.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>
                                    Platform fee (
                                    {platformSettings?.feePercentage || 5}%):
                                  </span>
                                  <span>
                                    $
                                    {(
                                      (leaderPods[0].costPerPerson *
                                        (platformSettings?.feePercentage ||
                                          5)) /
                                      100
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-medium text-gray-900">
                                  <span>Member pays:</span>
                                  <span>
                                    $
                                    {(
                                      leaderPods[0].costPerPerson *
                                      (1 +
                                        (platformSettings?.feePercentage || 5) /
                                          100)
                                    ).toFixed(2)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between">
                                  <span>Pod membership cost:</span>
                                  <span>$100.00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>
                                    Platform fee (
                                    {platformSettings?.feePercentage || 5}%):
                                  </span>
                                  <span>
                                    $
                                    {(
                                      (100 *
                                        (platformSettings?.feePercentage ||
                                          5)) /
                                      100
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <Separator className="my-2" />
                                <div className="flex justify-between font-medium text-gray-900">
                                  <span>Member pays:</span>
                                  <span>
                                    $
                                    {(
                                      100 +
                                      (100 *
                                        (platformSettings?.feePercentage ||
                                          5)) /
                                        100
                                    ).toFixed(2)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Exit Timeline Setting */}
                      {leaderPods && leaderPods.length > 0 && (
                        <div className="border rounded-lg p-4 sm:p-6">
                          <div className="flex items-start space-x-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Calendar className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                Exit Timeline
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Set the number of days after the billing cycle ends
                                that members must wait before leaving the pod. This
                                helps ensure smooth transitions.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            {isEditingExitTimeline ? (
                              <div className="flex items-center space-x-3">
                                <Input
                                  type="number"
                                  min="0"
                                  max="90"
                                  value={exitTimelineDays}
                                  onChange={(e) =>
                                    setExitTimelineDays(
                                      Math.max(0, Math.min(90, parseInt(e.target.value) || 0))
                                    )
                                  }
                                  className="w-20"
                                  data-testid="input-exit-timeline-days"
                                />
                                <span className="text-sm text-gray-500">days</span>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updatePodMutation.mutate({
                                      podId: leaderPods[0].id,
                                      updates: { exitTimelineDays },
                                    });
                                    setIsEditingExitTimeline(false);
                                  }}
                                  disabled={updatePodMutation.isPending}
                                  data-testid="button-save-exit-timeline"
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setExitTimelineDays(
                                      leaderPods[0].exitTimelineDays ?? 30
                                    );
                                    setIsEditingExitTimeline(false);
                                  }}
                                  data-testid="button-cancel-exit-timeline"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center space-x-2">
                                  <span className="text-2xl font-bold text-amber-600">
                                    {leaderPods[0].exitTimelineDays ?? 30}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    days after billing cycle
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setExitTimelineDays(
                                      leaderPods[0].exitTimelineDays ?? 30
                                    );
                                    setIsEditingExitTimeline(true);
                                  }}
                                  data-testid="button-edit-exit-timeline"
                                >
                                  <Edit3 className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-800">
                              <strong>How it works:</strong> When a member's leave
                              request is approved, their exit date will be set to
                              the end of the current billing month plus this number
                              of days.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="border rounded-lg p-4 sm:p-6 bg-blue-50 border-blue-200">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">
                              About Platform Fees
                            </h4>
                            <p className="text-sm text-blue-800 mt-1">
                              Platform fees are added to help maintain FlexPod's
                              services. Members will see a breakdown of costs
                              (membership + platform fee) before completing
                              their payment.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Member Removal Confirmation Dialog */}
      <Dialog open={memberToRemove !== null} onOpenChange={() => setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <UserMinus className="w-5 h-5 mr-2" />
              Remove Pod Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to remove <strong>{memberToRemove?.userName}</strong> from your pod? 
              They will be notified by email about this removal.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This action cannot be undone. The member will need to submit a new join request if they want to rejoin.
              </p>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setMemberToRemove(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (memberToRemove) {
                    removeMemberMutation.mutate({
                      podId: memberToRemove.podId,
                      userId: memberToRemove.userId,
                    });
                  }
                }}
                disabled={removeMemberMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-remove-member"
              >
                {removeMemberMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <UserMinus className="w-4 h-4 mr-2" />
                )}
                Remove Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Membership Verification Dialog */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Verify Bay Club Membership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Send a verification request to Bay Club to confirm this applicant's membership before accepting them to your pod.
            </p>
            
            {verifyingRequest && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p><strong>Applicant:</strong> {verifyingRequest.userName}</p>
                <p><strong>Email:</strong> {verifyingRequest.userEmail}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="bayClubEmail">Bay Club Email Address</Label>
                <Input
                  id="bayClubEmail"
                  type="email"
                  placeholder="membership@bayclubs.com"
                  value={bayClubEmail}
                  onChange={(e) => setBayClubEmail(e.target.value)}
                  data-testid="input-bay-club-email"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the Bay Club's membership verification email
                </p>
              </div>

              <div>
                <Label htmlFor="membershipId">Member's Bay Club ID</Label>
                <Input
                  id="membershipId"
                  type="text"
                  placeholder="Enter membership ID"
                  value={membershipIdInput}
                  onChange={(e) => setMembershipIdInput(e.target.value)}
                  data-testid="input-membership-id"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The member's Bay Club membership number to verify
                </p>
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setVerificationDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendVerification}
                disabled={!bayClubEmail || !membershipIdInput || verifyMembershipMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                data-testid="button-send-verification"
              >
                {verifyMembershipMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Verification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
