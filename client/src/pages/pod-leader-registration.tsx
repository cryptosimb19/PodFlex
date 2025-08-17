import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Crown, Users, ArrowRight } from "lucide-react";

export default function PodLeaderRegistration() {
  const [, navigate] = useLocation();

  const handleComplete = () => {
    // Mark onboarding as complete
    localStorage.setItem('flexpod_onboarding_complete', 'true');
    // Navigate to pod leader dashboard
    navigate("/pod-leader-dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Pod Leader!</h1>
          <p className="text-gray-600">Let's get your pod set up and ready for members.</p>
        </div>

        {/* Onboarding Content */}
        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="w-5 h-5 mr-2 text-orange-600" />
                Create Your Pod
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Set up your membership pod with details about location, pricing, and availability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Manage Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Review join requests, approve members, and manage your pod community.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Complete Button */}
        <Button 
          onClick={handleComplete}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}