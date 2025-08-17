import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Users, DollarSign, Star, CheckCircle, ArrowRight, Zap } from "lucide-react";

interface MembershipOption {
  id: string;
  name: string;
  type: "Single-Club" | "Multi-Club" | "Family";
  price: number;
  description: string;
  clubName: string;
  clubRegion: string;
  features: string[];
  spotsAvailable: number;
  totalSpots: number;
  isPopular?: boolean;
}

const membershipOptions: MembershipOption[] = [
  {
    id: "bc-sf-single",
    name: "Bay Club SF Single-Club",
    type: "Single-Club",
    price: 89,
    description: "Access to Bay Club SF Downtown location",
    clubName: "Bay Club SF",
    clubRegion: "San Francisco",
    features: ["State-of-the-art fitness equipment", "Group fitness classes", "Swimming pool", "Locker rooms"],
    spotsAvailable: 2,
    totalSpots: 4,
    isPopular: true
  },
  {
    id: "bc-marin-multi",
    name: "Bay Club Marin Multi-Club",
    type: "Multi-Club",
    price: 145,
    description: "Access to all Bay Club locations in Marin County",
    clubName: "Bay Club Marin",
    clubRegion: "Marin County",
    features: ["All Bay Club Marin locations", "Tennis courts", "Spa services", "Personal training"],
    spotsAvailable: 1,
    totalSpots: 3
  },
  {
    id: "bc-peninsula-family",
    name: "Bay Club Peninsula Family",
    type: "Family",
    price: 210,
    description: "Family membership for Bay Club Peninsula locations",
    clubName: "Bay Club Peninsula",
    clubRegion: "Peninsula",
    features: ["Family-friendly amenities", "Kids programs", "Multiple locations", "Guest privileges"],
    spotsAvailable: 3,
    totalSpots: 5
  },
  {
    id: "bc-santa-clara-single",
    name: "Bay Club Santa Clara Single-Club",
    type: "Single-Club",
    price: 75,
    description: "Access to Bay Club Santa Clara location",
    clubName: "Bay Club Santa Clara",
    clubRegion: "South Bay",
    features: ["Modern fitness center", "Basketball court", "Yoga studio", "Nutrition counseling"],
    spotsAvailable: 1,
    totalSpots: 4
  },
  {
    id: "bc-walnut-creek-multi",
    name: "Bay Club Walnut Creek Multi-Club",
    type: "Multi-Club",
    price: 135,
    description: "Access to Bay Club East Bay locations",
    clubName: "Bay Club Walnut Creek",
    clubRegion: "East Bay",
    features: ["Multiple East Bay locations", "Racquet sports", "Aquatics programs", "Social events"],
    spotsAvailable: 2,
    totalSpots: 3
  }
];

export default function MembershipSelection() {
  const [, navigate] = useLocation();
  const [selectedMembership, setSelectedMembership] = useState<string>("");

  const handleContinue = () => {
    if (!selectedMembership) {
      return;
    }

    // Store the selected membership
    localStorage.setItem('selectedMembership', selectedMembership);
    
    // Get user type to determine next step
    const userType = localStorage.getItem('flexpod_user_type');
    
    if (userType === "pod_leader") {
      navigate("/pod-leader-registration");
    } else {
      navigate("/onboarding");
    }
  };

  const formatPrice = (price: number) => `$${price}`;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Single-Club": return "bg-blue-100 text-blue-800";
      case "Multi-Club": return "bg-purple-100 text-purple-800";
      case "Family": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Bay Club Membership</h1>
          <p className="text-gray-600">Select the membership you'd like to join or share</p>
        </div>

        {/* Membership Options */}
        <RadioGroup value={selectedMembership} onValueChange={setSelectedMembership} className="space-y-4">
          {membershipOptions.map((membership) => (
            <div key={membership.id} className="relative">
              <Label htmlFor={membership.id} className="cursor-pointer">
                <Card className={`transition-all duration-200 hover:shadow-lg ${
                  selectedMembership === membership.id 
                    ? 'ring-2 ring-purple-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <RadioGroupItem value={membership.id} id={membership.id} />
                          <CardTitle className="text-lg">{membership.name}</CardTitle>
                          {membership.isPopular && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <Star className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {membership.clubRegion}
                          </div>
                          <Badge className={getTypeColor(membership.type)} variant="secondary">
                            {membership.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatPrice(membership.price)}
                          <span className="text-sm font-normal text-gray-500">/month</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          {membership.spotsAvailable} of {membership.totalSpots} spots
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-gray-700 mb-3">{membership.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {membership.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {membership.spotsAvailable <= 1 && (
                      <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                        <p className="text-sm text-orange-800 font-medium">
                          Only {membership.spotsAvailable} spot{membership.spotsAvailable !== 1 ? 's' : ''} remaining!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Continue Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedMembership}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium disabled:opacity-50"
          >
            Continue to Next Step
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't see your preferred membership? Contact us and we'll help you find the right pod.
          </p>
        </div>
      </div>
    </div>
  );
}