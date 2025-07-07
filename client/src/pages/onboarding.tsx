import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Users, MapPin } from "lucide-react";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  membershipId: string;
  preferredRegion: string;
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    membershipId: "",
    preferredRegion: "",
  });
  const [, navigate] = useLocation();

  const handleInputChange = (key: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    // In a real app, this would save user data to backend
    console.log("User data:", userData);
    navigate("/pods");
  };

  const canProceedToStep2 = userData.firstName && userData.lastName && userData.email;
  const canProceedToStep3 = userData.membershipId;
  const canFinish = userData.preferredRegion;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to FlexAccess</CardTitle>
              <p className="text-muted-foreground">
                Fun is better when Shared
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={userData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={userData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={userData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
                className="w-full"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Bay Club Membership</CardTitle>
              <p className="text-muted-foreground">
                Help us verify your Bay Club membership
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bay Club Membership ID</label>
                <Input
                  value={userData.membershipId}
                  onChange={(e) => handleInputChange('membershipId', e.target.value)}
                  placeholder="BC123456"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Found on your Bay Club membership card or app
                </p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-accent" />
              </div>
              <CardTitle className="text-2xl">Preferred Region</CardTitle>
              <p className="text-muted-foreground">
                Choose your preferred Bay Club region to see relevant pods
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <Select value={userData.preferredRegion} onValueChange={(value) => handleInputChange('preferredRegion', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preferred region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="San Jose">San Jose Campus</SelectItem>
                    <SelectItem value="San Francisco">San Francisco Campus</SelectItem>
                    <SelectItem value="Peninsula">Peninsula Campus</SelectItem>
                    <SelectItem value="Marin">Marin Campus</SelectItem>
                    <SelectItem value="East Bay">East Bay Campus</SelectItem>
                    <SelectItem value="Santa Clara">Santa Clara Campus</SelectItem>
                    <SelectItem value="Los Angeles">Los Angeles Campus</SelectItem>
                    <SelectItem value="San Diego">San Diego Campus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You'll see pods in your preferred region first, but can browse all available pods.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleFinish}
                  disabled={!canFinish}
                  className="flex-1"
                >
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      {renderStep()}
      
      {/* Progress indicator */}
      <div className="flex space-x-2 mt-6">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-colors ${
              step <= currentStep ? 'bg-primary' : 'bg-primary/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}