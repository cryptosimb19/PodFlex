import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Zap, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const loginMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/auth/login", "POST", data);
    },
    onSuccess: (data) => {
      // Store the access token
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      toast({
        title: "Welcome Back!",
        description: "You have successfully signed in to FlexPod.",
      });

      // Check if user has completed onboarding flow
      const userType = localStorage.getItem('flexpod_user_type');
      const hasCompletedOnboarding = localStorage.getItem('flexpod_onboarding_complete');
      
      if (!userType) {
        // First time user, go to user type selection
        navigate("/user-type");
      } else if (!hasCompletedOnboarding) {
        // User has type but hasn't completed onboarding
        if (userType === 'pod_leader') {
          navigate("/pod-leader-registration");
        } else {
          navigate("/onboarding");
        }
      } else {
        // Existing user, go to appropriate dashboard
        if (userType === 'pod_leader') {
          navigate("/pod-leader-dashboard");
        } else {
          navigate("/pods");
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Please check your email and password.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your FlexPod account</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-center text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  placeholder="john@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange("password")}
                    placeholder="••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>

              {/* Demo Credentials */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Demo Credentials:</p>
                <p className="text-xs text-blue-700">
                  Email: lead1@example.com<br />
                  Password: password123
                </p>
              </div>

              {/* Register Link */}
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-purple-600 hover:text-purple-800"
                    onClick={() => navigate("/register")}
                  >
                    Create one here
                  </Button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}