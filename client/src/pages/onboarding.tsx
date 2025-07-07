import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, MapPin } from "lucide-react";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  primaryCampus: string;
  primaryClub: string;
  membershipLevel: string;
  membershipId: string;
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    primaryCampus: "",
    primaryClub: "",
    membershipLevel: "",
    membershipId: "",
  });
  const [, navigate] = useLocation();
  
  // Get user type from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const userType = searchParams.get('type') || 'seeker'; // 'seeker' or 'lead'
  
  // Helper functions for dynamic form options
  const getAvailableClubsForCampus = (campus: string) => {
    const clubsByCampus: Record<string, Array<{value: string, label: string}>> = {
      "San Francisco": [
        { value: "Bay Club San Francisco", label: "Bay Club San Francisco" },
        { value: "Bay Club Financial District", label: "Bay Club Financial District" },
        { value: "Bay Club Gateway", label: "Bay Club Gateway" },
        { value: "Bay Club South San Francisco", label: "Bay Club South San Francisco" }
      ],
      "Marin": [
        { value: "Bay Club Marin", label: "Bay Club Marin" },
        { value: "Bay Club Ross Valley", label: "Bay Club Ross Valley" },
        { value: "Bay Club Rolling Hills", label: "Bay Club Rolling Hills" },
        { value: "StoneTree Golf Club", label: "StoneTree Golf Club" }
      ],
      "East Bay": [
        { value: "Bay Club Walnut Creek", label: "Bay Club Walnut Creek" },
        { value: "Bay Club Pleasanton", label: "Bay Club Pleasanton" },
        { value: "Bay Club Fremont", label: "Bay Club Fremont" },
        { value: "Crow Canyon Country Club", label: "Crow Canyon Country Club" }
      ],
      "Peninsula": [
        { value: "Bay Club Redwood Shores", label: "Bay Club Redwood Shores" },
        { value: "Bay Club Broadway Tennis", label: "Bay Club Broadway Tennis" }
      ],
      "Santa Clara": [
        { value: "Bay Club Santa Clara", label: "Bay Club Santa Clara" }
      ],
      "San Jose": [
        { value: "Bay Club Courtside", label: "Bay Club Courtside" },
        { value: "Boulder Ridge Golf Club", label: "Boulder Ridge Golf Club" }
      ],
      "Washington": [
        { value: "Bay Club Bellevue", label: "Bay Club Bellevue" },
        { value: "Bay Club Redmond", label: "Bay Club Redmond" },
        { value: "Bay Club West Seattle", label: "Bay Club West Seattle" }
      ],
      "San Diego": [
        { value: "Bay Club Mission Bay", label: "Bay Club Mission Bay" },
        { value: "Bay Club Scripps Ranch", label: "Bay Club Scripps Ranch" }
      ],
      "Los Angeles": [
        { value: "Bay Club Manhattan Beach", label: "Bay Club Manhattan Beach" },
        { value: "Bay Club Santa Monica", label: "Bay Club Santa Monica" }
      ],
      "Oregon": [
        { value: "Bay Club Portland", label: "Bay Club Portland" },
        { value: "Bay Club Lake Oswego", label: "Bay Club Lake Oswego" }
      ]
    };
    return clubsByCampus[campus] || [];
  };
  
  const getAvailableMembershipLevelsForClub = (club: string) => {
    const membershipsByClub: Record<string, Array<{value: string, label: string, description: string}>> = {
      "Boulder Ridge Golf Club": [
        { value: "Club West Gold", label: "Club West Gold", description: "$445/mo - All Bay Club locations + 4-day sports booking" }
      ],
      "Bay Club Courtside": [
        { value: "Club West Gold", label: "Club West Gold", description: "$445/mo - All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "$375/mo - South Bay + SF + East Bay access" }
      ],
      "Bay Club Pleasanton": [
        { value: "East Bay Campus", label: "East Bay Campus", description: "$265/mo - East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "$355/mo - East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "$335/mo - SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "$375/mo - South Bay + SF + East Bay" },
        { value: "Single Site", label: "Single Site", description: "$227/mo - Bay Club Pleasanton only" },
        { value: "Club West Gold", label: "Club West Gold", description: "$445/mo - All Bay Club locations + 4-day sports booking" }
      ],
      "Bay Club Fremont": [
        { value: "East Bay Campus", label: "East Bay Campus", description: "$265/mo - East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "$355/mo - East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "$335/mo - SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "$375/mo - South Bay + SF + East Bay" },
        { value: "Single Site", label: "Single Site", description: "$227/mo - Bay Club Fremont only" }
      ],
      "Crow Canyon Country Club": [
        { value: "Club West Gold", label: "Club West Gold", description: "$445/mo - All Bay Club locations + 4-day sports booking" },
        { value: "East Bay Campus", label: "East Bay Campus", description: "$265/mo - East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "$355/mo - East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "$335/mo - SF + Marin + East Bay markets" }
      ],
      "Bay Club Walnut Creek": [
        { value: "Club West Gold", label: "Club West Gold", description: "$445/mo - All Bay Club locations + 4-day sports booking" },
        { value: "East Bay Campus", label: "East Bay Campus", description: "$265/mo - East Bay locations + Crow Canyon CC" }
      ]
    };
    return membershipsByClub[club] || [];
  };

  const handleInputChange = (key: keyof UserData, value: string) => {
    setUserData(prev => {
      // Reset dependent fields when campus or club changes
      if (key === 'primaryCampus') {
        return { ...prev, [key]: value, primaryClub: "", membershipLevel: "" };
      }
      if (key === 'primaryClub') {
        return { ...prev, [key]: value, membershipLevel: "" };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleFinish = async () => {
    // In a real app, this would save user data to backend
    console.log("User data:", userData);
    navigate("/pods");
  };

  const canProceedToStep2 = userData.firstName && userData.lastName && userData.email;
  const canProceedToStep3 = userData.primaryCampus && userData.primaryClub && userData.membershipLevel;
  const canFinish = true; // No additional step needed

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome to FlexAccess</CardTitle>
              <p className="text-muted-foreground">
                {userType === 'lead' ? 'Let\'s set up your pod leadership profile' : 'Let\'s find you the perfect pod'}
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
              <CardTitle className="text-2xl">
                {userType === 'lead' ? 'Bay Club Membership Details' : 'Bay Club Membership'}
              </CardTitle>
              <p className="text-muted-foreground">
                {userType === 'lead' 
                  ? 'Verify your membership to create and manage pods' 
                  : 'Help us verify your Bay Club membership'
                }
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Campus</label>
                <Select value={userData.primaryCampus} onValueChange={(value) => handleInputChange('primaryCampus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="San Jose">San Jose</SelectItem>
                    <SelectItem value="East Bay">East Bay</SelectItem>
                    <SelectItem value="San Francisco">San Francisco</SelectItem>
                    <SelectItem value="Marin">Marin</SelectItem>
                    <SelectItem value="Washington">Washington</SelectItem>
                    <SelectItem value="San Diego">San Diego</SelectItem>
                    <SelectItem value="Peninsula">Peninsula</SelectItem>
                    <SelectItem value="Santa Clara">Santa Clara</SelectItem>
                    <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                    <SelectItem value="Oregon">Oregon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Club</label>
                <Select 
                  value={userData.primaryClub} 
                  onValueChange={(value) => handleInputChange('primaryClub', value)}
                  disabled={!userData.primaryCampus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={userData.primaryCampus ? "Select your primary club" : "Select campus first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableClubsForCampus(userData.primaryCampus).map((club) => (
                      <SelectItem key={club.value} value={club.value}>
                        {club.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Membership Level</label>
                <Select 
                  value={userData.membershipLevel} 
                  onValueChange={(value) => handleInputChange('membershipLevel', value)}
                  disabled={!userData.primaryClub}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={userData.primaryClub ? "Select membership level" : "Select club first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMembershipLevelsForClub(userData.primaryClub).map((membership) => (
                      <SelectItem key={membership.value} value={membership.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{membership.label}</span>
                          <span className="text-xs text-gray-500">{membership.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Bay Club Membership ID <span className="text-muted-foreground">(optional)</span></label>
                <Input
                  value={userData.membershipId}
                  onChange={(e) => handleInputChange('membershipId', e.target.value)}
                  placeholder="BC123456"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Found on your Bay Club membership card or app. Leave blank if you don't have one yet.
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
                  onClick={handleFinish}
                  disabled={!canProceedToStep3}
                  className="flex-1"
                >
                  Complete Registration
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