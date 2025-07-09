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
  street: string;
  aptUnit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
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
    street: "",
    aptUnit: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    dateOfBirth: "",
  });
  const [, navigate] = useLocation();
  
  // Get user type from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const userType = searchParams.get('type') || 'seeker'; // 'seeker' or 'lead'
  
  // Helper functions for dynamic form options
  const getAvailableClubsForCampus = (campus: string) => {
    const clubsByCampus: Record<string, Array<{value: string, label: string}>> = {
      "San Francisco": [
        { value: "Financial District", label: "Financial District" },
        { value: "Gateway", label: "Gateway" },
        { value: "San Francisco", label: "San Francisco" },
        { value: "South San Francisco", label: "South San Francisco" }
      ],
      "Marin": [
        { value: "Marin", label: "Marin" },
        { value: "StoneTree Golf Club", label: "StoneTree Golf Club" },
        { value: "Rolling Hills", label: "Rolling Hills" },
        { value: "Ross Valley", label: "Ross Valley" }
      ],
      "East Bay": [
        { value: "Pleasanton", label: "Pleasanton" },
        { value: "Fremont", label: "Fremont" },
        { value: "Crow Canyon Country Club", label: "Crow Canyon Country Club" },
        { value: "Walnut Creek", label: "Walnut Creek" }
      ],
      "Peninsula": [
        { value: "Broadway Tennis", label: "Broadway Tennis" },
        { value: "Redwood Shores", label: "Redwood Shores" }
      ],
      "Santa Clara": [
        { value: "Santa Clara", label: "Santa Clara" }
      ],
      "San Jose": [
        { value: "Boulder Ridge Golf Club", label: "Boulder Ridge Golf Club" },
        { value: "Courtside", label: "Courtside" }
      ],
      "Washington": [
        { value: "PRO Club Seattle", label: "PRO Club Seattle" },
        { value: "PRO Club Bellevue", label: "PRO Club Bellevue" }
      ],
      "San Diego": [
        { value: "Carmel Valley", label: "Carmel Valley" },
        { value: "Fairbanks Ranch Country Club", label: "Fairbanks Ranch Country Club" }
      ],
      "Los Angeles": [
        { value: "El Segundo", label: "El Segundo" },
        { value: "Redondo Beach", label: "Redondo Beach" },
        { value: "Santa Monica", label: "Santa Monica" }
      ],
      "Oregon": [
        { value: "Portland", label: "Portland" }
      ]
    };
    return clubsByCampus[campus] || [];
  };
  
  const getAvailableMembershipLevelsForClub = (club: string) => {
    const membershipsByClub: Record<string, Array<{value: string, label: string, description: string}>> = {
      // San Jose
      "Boulder Ridge Golf Club": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" }
      ],
      "Courtside": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay access" }
      ],
      // East Bay
      "Pleasanton": [
        { value: "East Bay Campus", label: "East Bay Campus", description: "East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" },
        { value: "Single Site", label: "Single Site", description: "Pleasanton only" },
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" }
      ],
      "Fremont": [
        { value: "East Bay Campus", label: "East Bay Campus", description: "East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" },
        { value: "Single Site", label: "Single Site", description: "Fremont only" }
      ],
      "Crow Canyon Country Club": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "East Bay Campus", label: "East Bay Campus", description: "East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" }
      ],
      "Walnut Creek": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "East Bay Campus", label: "East Bay Campus", description: "East Bay locations + Crow Canyon CC" },
        { value: "Executive Club East Bay", label: "Executive Club East Bay", description: "East Bay + Tennis access" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" },
        { value: "Single Site", label: "Single Site", description: "Walnut Creek only" }
      ],
      // San Francisco
      "Financial District": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" },
        { value: "Single Site", label: "Single Site", description: "Financial District only" }
      ],
      "Gateway": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" }
      ],
      "San Francisco": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" }
      ],
      "South San Francisco": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" }
      ],
      // Peninsula
      "Broadway Tennis": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" }
      ],
      "Redwood Shores": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" }
      ],
      // Oregon
      "Portland": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Single Site", label: "Single Site", description: "Portland only" }
      ],
      // Los Angeles
      "El Segundo": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club LA", label: "Executive Club LA", description: "Los Angeles area locations" },
        { value: "Executive Club Southern CA", label: "Executive Club Southern CA", description: "Southern California locations" }
      ],
      "Redondo Beach": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club LA", label: "Executive Club LA", description: "Los Angeles area locations" },
        { value: "Executive Club Southern CA", label: "Executive Club Southern CA", description: "Southern California locations" }
      ],
      "Santa Monica": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club LA", label: "Executive Club LA", description: "Los Angeles area locations" },
        { value: "Executive Club Southern CA", label: "Executive Club Southern CA", description: "Southern California locations" },
        { value: "Single Site", label: "Single Site", description: "Santa Monica only" }
      ],
      // Santa Clara
      "Santa Clara": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club South Bay", label: "Executive Club South Bay", description: "South Bay + SF + East Bay" },
        { value: "Santa Clara Campus", label: "Santa Clara Campus", description: "Santa Clara campus locations" }
      ],
      // San Diego
      "Carmel Valley": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club Southern CA", label: "Executive Club Southern CA", description: "Southern California locations" }
      ],
      "Fairbanks Ranch Country Club": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" }
      ],
      // Washington
      "PRO Club Seattle": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Single Site", label: "Single Site", description: "PRO Club Seattle only" },
        { value: "Campus", label: "Campus", description: "Washington campus locations" }
      ],
      "PRO Club Bellevue": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Single Site", label: "Single Site", description: "PRO Club Bellevue only" },
        { value: "Campus", label: "Campus", description: "Washington campus locations" }
      ],
      // Marin
      "Marin": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" }
      ],
      "StoneTree Golf Club": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" }
      ],
      "Rolling Hills": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" },
        { value: "Executive Club North Bay", label: "Executive Club North Bay", description: "SF + Marin + East Bay markets" },
        { value: "Single Site", label: "Single Site", description: "Rolling Hills only" }
      ],
      "Ross Valley": [
        { value: "Club West Gold", label: "Club West Gold", description: "All Bay Club locations + 4-day sports booking" }
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
                Select the Location and Membership Level you are looking to join
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
                <label className="text-sm font-medium">Bay Club Membership ID</label>
                <Input
                  value={userData.membershipId}
                  onChange={(e) => handleInputChange('membershipId', e.target.value)}
                  placeholder="BC123456"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Found on your Bay Club membership card or app.
                </p>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium">Current Address</label>
                <div className="space-y-2">
                  <Input
                    value={userData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="Street Address"
                  />
                  <Input
                    value={userData.aptUnit}
                    onChange={(e) => handleInputChange('aptUnit', e.target.value)}
                    placeholder="Apt/Unit (Optional)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={userData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={userData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={userData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="Zip Code"
                    />
                    <Input
                      value={userData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of Birth</label>
                <Input
                  type="date"
                  value={userData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
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
                  disabled={!userData.membershipId || !userData.street || !userData.city || !userData.state || !userData.zipCode || !userData.country || !userData.dateOfBirth}
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