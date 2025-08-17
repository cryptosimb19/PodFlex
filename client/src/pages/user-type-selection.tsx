
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, Plus } from "lucide-react";

export default function UserTypeSelection() {
  const [, navigate] = useLocation();

  const handleSelection = (type: "pod_seeker" | "pod_leader") => {
    // Store the user type selection for after registration
    localStorage.setItem('flexpod_pending_user_type', type);
    
    // Navigate to registration
    navigate("/register");
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
            Back to Home
          </Button>
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Path</h1>
          <p className="text-gray-600">How would you like to use FlexPod?</p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4 mb-8">
          <Card 
            className="cursor-pointer transition-all duration-300 hover-lift card-transition hover:shadow-lg"
            onClick={() => handleSelection("pod_seeker")}
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
              <p className="text-sm text-gray-600 mb-4">
                Find and join existing membership pods to save money on your Bay Club membership.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">Quick find</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">Premium access</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Save money</span>
              </div>
              <Button
                size="sm"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelection("pod_seeker");
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                Join Pods
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all duration-300 hover-lift card-transition hover:shadow-lg"
            onClick={() => handleSelection("pod_leader")}
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
              <p className="text-sm text-gray-600 mb-4">
                Create and manage your own membership pod to find members and reduce costs.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">Find Members</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">Manage Pod</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Reduce Costs</span>
              </div>
              <Button
                size="sm"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelection("pod_leader");
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pod
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Choose your path to get started with FlexPod and save on your membership costs.
          </p>
        </div>


      </div>
    </div>
  );
}