import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, DollarSign, Star, CheckCircle, ArrowRight, Zap, Filter, Building2 } from "lucide-react";

interface MembershipOption {
  id: string;
  campus: string;
  club: string;
  membershipLevel: string;
  description: string;
  price: number;
  features: string[];
  category: "Premium" | "Executive" | "Campus" | "Single Site";
  spotsAvailable: number;
  totalSpots: number;
  isPopular?: boolean;
}

// Authentic Bay Club membership options based on real data
const membershipOptions: MembershipOption[] = [
  {
    id: "club-west-gold",
    campus: "Multi-Campus",
    club: "All Bay Club Locations",
    membershipLevel: "Club West Gold",
    description: "Club West Gold unlocks full access to all Bay Club locations (excluding Manhattan Country Club). Members can take advantage of a 4-day advanced booking window for all Sports with complimentary Racquet Sports at all locations (excluding PRO Club) and pay-to-play golf access with 10% off greens fees. 2 complimentary childcare hours per day per child on the membership at participating locations. Exclusive member pricing at Renaissance Walnut Creek hotel.",
    price: 285,
    features: ["Access to all Bay Club locations", "4-day advanced booking", "Complimentary racquet sports", "Golf with 10% off greens fees", "2 hours complimentary childcare", "Hotel discounts"],
    category: "Premium",
    spotsAvailable: 2,
    totalSpots: 4,
    isPopular: true
  },
  {
    id: "exec-south-bay",
    campus: "South Bay",
    club: "Santa Clara, Redwood Shores, Courtside",
    membershipLevel: "Executive Club South Bay",
    description: "Our premiere membership for fitness, group exercise, aquatics, pickleball, family – and more! – with full access to Santa Clara, Redwood Shores, and Courtside locations, as well as access to San Francisco campus and East Bay campus.",
    price: 225,
    features: ["Santa Clara, Redwood Shores, Courtside access", "San Francisco campus access", "East Bay campus access", "Fitness & group exercise", "Aquatics & pickleball", "Family amenities"],
    category: "Executive",
    spotsAvailable: 3,
    totalSpots: 5,
    isPopular: true
  },
  {
    id: "exec-north-bay",
    campus: "North Bay",
    club: "San Francisco, Marin, East Bay",
    membershipLevel: "Executive Club North Bay",
    description: "Our premier fitness membership in the North Bay unlocks access to San Francisco, Marin, and East Bay markets, featuring spacious athletics clubs, sports resorts, and two 18-hole golf courses.",
    price: 245,
    features: ["San Francisco market access", "Marin market access", "East Bay market access", "Spacious athletics clubs", "Sports resorts", "Two 18-hole golf courses"],
    category: "Executive",
    spotsAvailable: 1,
    totalSpots: 3
  },
  {
    id: "exec-east-bay",
    campus: "East Bay", 
    club: "Walnut Creek, Pleasanton, Fremont, Crow Canyon",
    membershipLevel: "Executive Club East Bay",
    description: "Your East Bay membership that unlocks Executive Club East Bay includes access to Walnut Creek, Pleasanton, Fremont, and Crow Canyon Country Club. Enjoy amenities like aquatics, fitness, and group exercise.",
    price: 205,
    features: ["Walnut Creek access", "Pleasanton access", "Fremont access", "Crow Canyon Country Club", "Aquatics programs", "Fitness & group exercise"],
    category: "Executive",
    spotsAvailable: 2,
    totalSpots: 4
  },
  {
    id: "exec-la",
    campus: "Los Angeles",
    club: "El Segundo, Redondo Beach, Santa Monica",
    membershipLevel: "Executive Club LA",
    description: "Ideal for individuals and families with varied interests, this versatile membership offers fitness, aquatics, basketball, and social at our Los Angeles clubs up and down the coast.",
    price: 235,
    features: ["El Segundo access", "Redondo Beach access", "Santa Monica access", "Fitness & aquatics", "Basketball courts", "Social programming"],
    category: "Executive",
    spotsAvailable: 2,
    totalSpots: 3
  },
  {
    id: "exec-southern-ca",
    campus: "Southern California",
    club: "San Diego, Los Angeles, Bay Club Financial District",
    membershipLevel: "Executive Club Southern CA",
    description: "Includes fitness access to San Diego Campus, Los Angeles Campus, and Bay Club Financial District. Members will experience Fitness, Aquatics, Basketball, Group Fitness Programs, Social Programming, Mind-Body Programs, Family amenities, and more.",
    price: 255,
    features: ["San Diego campus access", "Los Angeles campus access", "Financial District access", "Mind-body programs", "Social programming", "Family amenities"],
    category: "Executive",
    spotsAvailable: 1,
    totalSpots: 4
  },
  {
    id: "santa-clara-campus",
    campus: "Santa Clara",
    club: "Santa Clara",
    membershipLevel: "Santa Clara Campus",
    description: "Sitting on 8 acres, our expansive sports resort in the heart of Silicon Valley features fitness, aquatics, basketball, pickleball, group fitness programs, social programming, and more.",
    price: 185,
    features: ["8-acre sports resort", "Silicon Valley location", "Basketball courts", "Pickleball courts", "Group fitness programs", "Social programming"],
    category: "Campus",
    spotsAvailable: 4,
    totalSpots: 6
  },
  {
    id: "east-bay-campus",
    campus: "East Bay",
    club: "Walnut Creek, Pleasanton, Fremont, Crow Canyon",
    membershipLevel: "East Bay Campus",
    description: "East Bay Campus membership includes access to Walnut Creek, Pleasanton, Fremont, and Crow Canyon Country Club. Enjoy extensive amenities within the campus.",
    price: 175,
    features: ["Multi-location access", "Walnut Creek", "Pleasanton", "Fremont", "Crow Canyon Country Club", "Extensive amenities"],
    category: "Campus",
    spotsAvailable: 3,
    totalSpots: 5
  },
  {
    id: "pro-club-campus",
    campus: "Washington",
    club: "PRO Club Seattle & Bellevue",
    membershipLevel: "Campus",
    description: "Athletic club access to PRO Club Bellevue. Enjoy access to 12,000 sq/ft free weight center, 4 fitness centers, 4 indoor pools, 4 basketball courts, 9 squash courts, and more.",
    price: 195,
    features: ["12,000 sq/ft free weight center", "4 fitness centers", "4 indoor pools", "4 basketball courts", "9 squash courts", "Premium amenities"],
    category: "Campus",
    spotsAvailable: 2,
    totalSpots: 4
  },
  {
    id: "single-site-sf",
    campus: "San Francisco",
    club: "Financial District",
    membershipLevel: "Single Site",
    description: "Single-site membership grants access to one specific club with standard amenities. Ideal for those looking for a local option with fitness, aquatics, and group exercise programs.",
    price: 165,
    features: ["Financial District location", "Standard fitness amenities", "Aquatics access", "Group exercise programs", "Local convenience", "Cost-effective option"],
    category: "Single Site",
    spotsAvailable: 3,
    totalSpots: 4
  },
  {
    id: "single-site-la",
    campus: "Los Angeles", 
    club: "Santa Monica",
    membershipLevel: "Single Site",
    description: "Single-site membership grants access to one specific club with standard amenities. Ideal for those looking for a local option with fitness, aquatics, and group exercise programs.",
    price: 155,
    features: ["Santa Monica location", "Standard fitness amenities", "Aquatics access", "Group exercise programs", "Beach proximity", "Cost-effective option"],
    category: "Single Site",
    spotsAvailable: 2,
    totalSpots: 3
  },
  {
    id: "single-site-pro",
    campus: "Washington",
    club: "PRO Club Seattle",
    membershipLevel: "Single Site", 
    description: "Single-site membership grants access to one specific club with standard amenities. Ideal for those looking for a local option with fitness, aquatics, and group exercise programs.",
    price: 145,
    features: ["PRO Club Seattle location", "Standard fitness amenities", "Aquatics access", "Group exercise programs", "Pacific Northwest location", "Cost-effective option"],
    category: "Single Site",
    spotsAvailable: 1,
    totalSpots: 3
  }
];

export default function MembershipSelection() {
  const [, navigate] = useLocation();
  const [selectedMembership, setSelectedMembership] = useState<string>("");
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Premium": return "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border-orange-200";
      case "Executive": return "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 border-purple-200";
      case "Campus": return "bg-gradient-to-r from-green-100 to-teal-100 text-green-800 border-green-200";
      case "Single Site": return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get unique campuses and categories for filtering
  const uniqueCampuses = [...new Set(membershipOptions.map(option => option.campus))].sort();
  const uniqueCategories = [...new Set(membershipOptions.map(option => option.category))].sort();

  // Filter membership options
  const filteredOptions = membershipOptions.filter(option => {
    const matchesCampus = !selectedCampus || selectedCampus === "all" || option.campus === selectedCampus;
    const matchesCategory = !selectedCategory || selectedCategory === "all" || option.category === selectedCategory;
    return matchesCampus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Bay Club Membership</h1>
          <p className="text-gray-600">Select from authentic Bay Club membership levels and locations</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="campus-filter" className="text-sm font-medium text-gray-700 mb-2 block">
              <Building2 className="w-4 h-4 inline mr-1" />
              Filter by Campus
            </Label>
            <Select value={selectedCampus} onValueChange={setSelectedCampus}>
              <SelectTrigger>
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {uniqueCampuses.map(campus => (
                  <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700 mb-2 block">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by Category
            </Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Membership Options */}
        <RadioGroup value={selectedMembership} onValueChange={setSelectedMembership} className="space-y-4">
          {filteredOptions.map((membership) => (
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
                          <CardTitle className="text-lg">{membership.membershipLevel}</CardTitle>
                          {membership.isPopular && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <Star className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {membership.campus}
                          </div>
                          <Badge className={getCategoryColor(membership.category)} variant="secondary">
                            {membership.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{membership.club}</p>
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