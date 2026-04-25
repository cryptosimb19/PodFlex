import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Crown, User, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardSelect() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const userData = user as any;

  const isPodLeader =
    userData?.hasCompletedOnboarding && userData?.userType === "pod_leader";

  const { data: userJoinRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/join-requests", "user", userData?.id],
    queryFn: async () => {
      const response = await fetch(`/api/join-requests/user/${userData?.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userData?.id && isPodLeader,
  });

  const acceptedMemberships =
    userJoinRequests?.filter((req: any) => req.status === "accepted") || [];
  const isDualRole = isPodLeader && acceptedMemberships.length > 0;

  const isLoading = authLoading || (isPodLeader && requestsLoading);

  useEffect(() => {
    if (isLoading) return;

    const ud = user as any;

    if (!ud) {
      navigate("/login", { replace: true });
      return;
    }

    if (!ud.userType) {
      navigate("/user-type-selection", { replace: true });
      return;
    }

    if (!ud.hasCompletedOnboarding) {
      navigate(
        ud.userType === "pod_leader" ? "/pod-leader-registration" : "/onboarding",
        { replace: true }
      );
      return;
    }

    if (ud.userType === "pod_seeker") {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!isDualRole) {
      navigate("/pod-leader-dashboard", { replace: true });
    }
  }, [isLoading, user, isDualRole, navigate]);

  if (isLoading || !isDualRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-500 mt-1 text-sm">
            You have both roles. Where would you like to go?
          </p>
        </div>

        <div className="space-y-4">
          <Card
            className="cursor-pointer border-2 border-transparent hover:border-purple-400 transition-all hover:shadow-md"
            onClick={() => navigate("/pod-leader-dashboard")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Pod Leader</h2>
                    <p className="text-sm text-gray-500">
                      Manage your pod &amp; members
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 border-transparent hover:border-blue-400 transition-all hover:shadow-md"
            onClick={() => navigate("/dashboard")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Pod Member</h2>
                    <p className="text-sm text-gray-500">
                      {acceptedMemberships.length} pod
                      {acceptedMemberships.length > 1 ? "s" : ""} you&apos;ve
                      joined
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 text-xs"
            onClick={() => navigate("/pod-leader-dashboard")}
          >
            Skip to leader dashboard by default
          </Button>
        </div>
      </div>
    </div>
  );
}
