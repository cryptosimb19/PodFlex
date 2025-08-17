import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, MapPin, ArrowRight } from "lucide-react";

export default function OnboardingWizard() {
  const [, navigate] = useLocation();

  const handleComplete = () => {
    // Mark onboarding as complete
    localStorage.setItem('flexpod_onboarding_complete', 'true');
    // Navigate to pods search
    navigate("/pods");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to FlexPod!</h1>
          <p className="text-gray-600">Let's get you started with finding the perfect pod.</p>
        </div>

        {/* Onboarding Content */}
        <div className="space-y-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Find Your Perfect Pod
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Browse available membership pods in your area and join one that fits your schedule and budget.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Location-Based Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                We'll help you find pods at Bay Club locations convenient to you.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Complete Button */}
        <Button 
          onClick={handleComplete}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg"
        >
          Start Finding Pods
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}