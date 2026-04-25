import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Zap, Users, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function UserTypeSelection() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Use the shared auth hook for consistent query settings
  const { user, isLoading: authLoading, isSuccess } = useAuth();

  // Redirect users who have already completed onboarding
  useEffect(() => {
    // Wait for query to complete successfully
    if (authLoading || !isSuccess) return;
    
    const userData = user as any;
    if (userData?.hasCompletedOnboarding && userData?.userType) {
      if (userData.userType === 'pod_leader') {
        navigate('/pod-leader-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, isSuccess, navigate]);

  const saveUserTypeMutation = useMutation({
    mutationFn: async (userType: string) => {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userType }),
      });
      if (!response.ok) {
        throw new Error('Failed to save user type');
      }
      return response.json();
    },
    onSuccess: async (updatedUser) => {
      // Save to localStorage for immediate UI updates
      const userTypeValue = selectedType === "join" ? "pod_seeker" : "pod_leader";
      localStorage.setItem('flexpod_user_type', userTypeValue);

      // Seed the cache directly from the server response so the next page sees
      // the correct userType immediately, without waiting for a background refetch
      // that might have started before this mutation and carry stale data.
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      if (selectedType === "join") {
        navigate("/onboarding?type=seeker");
      } else if (selectedType === "fill") {
        navigate("/pod-leader-registration");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save user type",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    const userType = selectedType === "join" ? "pod_seeker" : "pod_leader";
    saveUserTypeMutation.mutate(userType);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Navigation userType="pod_seeker" />
      <div className="flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FlexPod</h1>
          <p className="text-gray-600">Fun is better when Shared</p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all duration-300 hover-lift card-transition ${
              selectedType === "join" 
                ? "ring-2 ring-primary bg-primary/5 border-primary/20 shadow-lg" 
                : "hover:shadow-lg"
            }`}
            onClick={() => setSelectedType("join")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-sm">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Join a Pod</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Quick find</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">Premium access</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Save money</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-300 hover-lift card-transition ${
              selectedType === "fill" 
                ? "ring-2 ring-primary bg-primary/5 border-primary/20 shadow-lg" 
                : "hover:shadow-lg"
            }`}
            onClick={() => setSelectedType("fill")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center shadow-sm">
                  <Plus className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Fill Your Pod</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">Find Members</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">Manage Pod</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Reduce Costs</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <Button 
          onClick={handleContinue}
          disabled={!selectedType || saveUserTypeMutation.isPending}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-300 hover:scale-105 transform button-glow"
          data-testid="button-continue-user-type"
        >
          {saveUserTypeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}