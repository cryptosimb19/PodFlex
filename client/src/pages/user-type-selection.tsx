import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, Plus, ArrowRight, LogIn } from "lucide-react";

export default function UserTypeSelection() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [, navigate] = useLocation();

  const handleContinue = () => {
    if (selectedType === "join") {
      navigate("/onboarding?type=seeker");
    } else if (selectedType === "fill") {
      navigate("/pod-leader-registration");
    }
  };

  const handleSignIn = (type: "join" | "fill") => {
    // Store the intended flow in localStorage so we can redirect after sign-in
    localStorage.setItem('pendingUserFlow', type);
    // Navigate to the appropriate dashboard based on user type
    if (type === "join") {
      navigate("/pods"); // Pod seeker goes to browse pods
    } else {
      navigate("/pod-leader-dashboard"); // Pod leader goes to their dashboard
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
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
              <div className="mt-3 flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Quick find</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">Premium access</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Save money</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignIn("join");
                }}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to Join Pods
              </Button>
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
              <div className="mt-3 flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">Find Members</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">Manage Pod</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Reduce Costs</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignIn("fill");
                }}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign in to Manage Pods
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <Button 
          onClick={handleContinue}
          disabled={!selectedType}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all duration-300 hover:scale-105 transform button-glow"
        >
          Get Started as New User
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>

        {/* Alternative Sign In Text */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account? Use the sign-in buttons above to access your dashboard directly.
          </p>
        </div>


      </div>
    </div>
  );
}