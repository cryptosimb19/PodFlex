import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, Users, MapPin, DollarSign, Calendar, Shield, ArrowRight, ArrowLeft } from "lucide-react";

interface PodLeaderData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  aptUnit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
  
  // Membership Info
  primaryCampus: string;
  primaryClub: string;
  membershipLevel: string;
  membershipId: string;
  
  // Pod Details
  podName: string;
  podDescription: string;
  monthlyFee: string;
  availableSpots: string;
  startDate: string;
  
  // Requirements
  requirements: string[];
  agreesToTerms: boolean;
}

export default function PodLeaderRegistration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PodLeaderData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    aptUnit: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    dateOfBirth: "",
    primaryCampus: "",
    primaryClub: "",
    membershipLevel: "",
    membershipId: "",
    podName: "",
    podDescription: "",
    monthlyFee: "",
    availableSpots: "",
    startDate: "",
    requirements: [],
    agreesToTerms: false,
  });
  const [, navigate] = useLocation();

  const handleInputChange = (key: keyof PodLeaderData, value: string | boolean | string[]) => {
    setFormData(prev => {
      // Reset dependent fields when campus or club changes
      if (key === 'primaryCampus') {
        return { ...prev, [key]: value as string, primaryClub: "", membershipLevel: "" };
      }
      if (key === 'primaryClub') {
        return { ...prev, [key]: value as string, membershipLevel: "" };
      }
      return { ...prev, [key]: value };
    });
  };

  // Get available campuses
  const getAvailableCampuses = () => {
    return [
      { value: "San Jose", label: "San Jose" },
      { value: "East Bay", label: "East Bay" },
      { value: "San Francisco", label: "San Francisco" },
      { value: "Marin", label: "Marin" },
      { value: "Washington", label: "Washington" },
      { value: "San Diego", label: "San Diego" },
      { value: "Peninsula", label: "Peninsula" },
      { value: "Santa Clara", label: "Santa Clara" },
      { value: "Los Angeles", label: "Los Angeles" },
      { value: "Oregon", label: "Oregon" }
    ];
  };

  // Get available clubs based on selected campus
  const getAvailableClubs = () => {
    const campus = formData.primaryCampus;
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

  // Get membership description based on selected membership level
  const getMembershipDescription = (membershipLevel: string) => {
    const descriptions: Record<string, string> = {
      "Club West Gold": "Club West Gold unlocks full access to all Bay Club locations (excluding Manhattan Country Club). Members can take advantage of a 4-day advanced booking window for all Sports with complimentary Racquet Sports at all locations (excluding PRO Club) and pay-to-play golf access with 10% off greens fees. 2 complimentary childcare hours per day per child on the membership at participating locations.",
      "Executive Club South Bay": "Premiere membership for fitness, group exercise, aquatics, pickleball, family – and more! – with full access to Santa Clara, Redwood Shores, and Courtside locations, as well as access to San Francisco campus and East Bay campus.",
      "East Bay Campus": "East Bay Campus membership includes access to Walnut Creek, Pleasanton, Fremont, and Crow Canyon Country Club. Enjoy extensive amenities within the campus.",
      "Executive Club East Bay": "Your East Bay membership that unlocks Executive Club East Bay includes access to Walnut Creek, Pleasanton, Fremont, and Crow Canyon Country Club. Enjoy amenities like aquatics, fitness, and group exercise.",
      "Executive Club North Bay": "Our premier fitness membership in the North Bay unlocks access to San Francisco, Marin, and East Bay markets, featuring spacious athletics clubs, sports resorts, and two 18-hole golf courses.",
      "Single Site": "Single-site membership grants access to one specific club with standard amenities. Ideal for those looking for a local option with fitness, aquatics, and group exercise programs.",
      "Executive Club LA": "Ideal for individuals and families with varied interests, this versatile membership offers fitness, aquatics, basketball, and social at our Los Angeles clubs up and down the coast.",
      "Executive Club Southern CA": "Includes fitness access to San Diego Campus, Los Angeles Campus, and Bay Club Financial District. Members will experience Fitness, Aquatics, Basketball, Group Fitness Programs, Social Programming, Mind-Body Programs, Family amenities, and more.",
      "Santa Clara Campus": "Sitting on 8 acres, our expansive sports resort in the heart of Silicon Valley features fitness, aquatics, basketball, pickleball, group fitness programs, social programming, and more.",
      "Campus": "Athletic club access to PRO Club Bellevue. Enjoy access to 12,000 sq/ft free weight center, 4 fitness centers, 4 indoor pools, 4 basketball courts, 9 squash courts, and more."
    };
    return descriptions[membershipLevel] || "";
  };

  // Get available membership levels based on selected club
  const getAvailableMembershipLevels = () => {
    const club = formData.primaryClub;
    
    // Bay Club authentic membership levels based on club (from official data)
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

  const handleRequirementToggle = (requirement: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.includes(requirement)
        ? prev.requirements.filter(r => r !== requirement)
        : [...prev.requirements, requirement]
    }));
  };

  const handleSubmit = async () => {
    // Save user data to localStorage for use in join requests
    const userData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      primaryCampus: formData.primaryCampus,
      primaryClub: formData.primaryClub,
      membershipLevel: formData.membershipLevel,
      membershipId: formData.membershipId,
      street: formData.street,
      aptUnit: formData.aptUnit,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: formData.country,
      dateOfBirth: formData.dateOfBirth,
    };
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // In a real app, this would create the pod and save to backend
    console.log("Pod Leader Registration Data:", formData);
    navigate("/pod-leader-dashboard");
  };

  const totalSteps = 4;

  const canProceedStep1 = formData.firstName && formData.lastName && formData.email && formData.phone && formData.street && formData.city && formData.state && formData.zipCode && formData.country && formData.dateOfBirth;
  const canProceedStep2 = formData.primaryCampus && formData.primaryClub && formData.membershipLevel;
  const canProceedStep3 = formData.podName && formData.podDescription && formData.monthlyFee && formData.availableSpots && formData.startDate && (formData.requirements.includes("Monthly Payment") || formData.requirements.includes("Annual Payment"));
  const canSubmit = formData.agreesToTerms;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Pod Leader Registration</CardTitle>
              <p className="text-muted-foreground">
                Let's start with your basic information
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium">Current Address</label>
                <div className="space-y-2">
                  <Input
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="Street Address"
                  />
                  <Input
                    value={formData.aptUnit}
                    onChange={(e) => handleInputChange('aptUnit', e.target.value)}
                    placeholder="Apt/Unit (Optional)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                    <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="AK">Alaska</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="AR">Arkansas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                        <SelectItem value="DE">Delaware</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="HI">Hawaii</SelectItem>
                        <SelectItem value="ID">Idaho</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                        <SelectItem value="IN">Indiana</SelectItem>
                        <SelectItem value="IA">Iowa</SelectItem>
                        <SelectItem value="KS">Kansas</SelectItem>
                        <SelectItem value="KY">Kentucky</SelectItem>
                        <SelectItem value="LA">Louisiana</SelectItem>
                        <SelectItem value="ME">Maine</SelectItem>
                        <SelectItem value="MD">Maryland</SelectItem>
                        <SelectItem value="MA">Massachusetts</SelectItem>
                        <SelectItem value="MI">Michigan</SelectItem>
                        <SelectItem value="MN">Minnesota</SelectItem>
                        <SelectItem value="MS">Mississippi</SelectItem>
                        <SelectItem value="MO">Missouri</SelectItem>
                        <SelectItem value="MT">Montana</SelectItem>
                        <SelectItem value="NE">Nebraska</SelectItem>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="NH">New Hampshire</SelectItem>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="NM">New Mexico</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="ND">North Dakota</SelectItem>
                        <SelectItem value="OH">Ohio</SelectItem>
                        <SelectItem value="OK">Oklahoma</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="PA">Pennsylvania</SelectItem>
                        <SelectItem value="RI">Rhode Island</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="SD">South Dakota</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="UT">Utah</SelectItem>
                        <SelectItem value="VT">Vermont</SelectItem>
                        <SelectItem value="VA">Virginia</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="WV">West Virginia</SelectItem>
                        <SelectItem value="WI">Wisconsin</SelectItem>
                        <SelectItem value="WY">Wyoming</SelectItem>
                        <SelectItem value="DC">Washington DC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="Zip Code"
                    />
                    <Input
                      value={formData.country}
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
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => navigate("/user-type")}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedStep1}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Bay Club Membership</CardTitle>
              <p className="text-muted-foreground">
                Enter your membership details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Campus</label>
                <Select value={formData.primaryCampus} onValueChange={(value) => handleInputChange('primaryCampus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableCampuses().map((campus) => (
                      <SelectItem key={campus.value} value={campus.value}>
                        {campus.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Club</label>
                <Select 
                  value={formData.primaryClub} 
                  onValueChange={(value) => handleInputChange('primaryClub', value)}
                  disabled={!formData.primaryCampus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.primaryCampus ? "Select your primary club" : "Select campus first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableClubs().map((club) => (
                      <SelectItem key={club.value} value={club.value}>
                        {club.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.primaryCampus && getAvailableClubs().length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No clubs available for this campus
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Membership Level</label>
                <Select 
                  value={formData.membershipLevel} 
                  onValueChange={(value) => handleInputChange('membershipLevel', value)}
                  disabled={!formData.primaryClub}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.primaryClub ? "Select membership level" : "Select club first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMembershipLevels().map((membership) => (
                      <SelectItem key={membership.value} value={membership.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{membership.label}</span>
                          <span className="text-xs text-gray-500">{membership.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.primaryClub && getAvailableMembershipLevels().length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No membership levels available for this club
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Bay Club Membership ID</label>
                <Input
                  value={formData.membershipId}
                  onChange={(e) => handleInputChange('membershipId', e.target.value)}
                  placeholder="BC123456"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Found on your Bay Club membership card or app.
                </p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Pod Details</CardTitle>
              <p className="text-muted-foreground">
                Set up your pod information
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Membership Description Display */}
              {formData.membershipLevel && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">{formData.membershipLevel}</h4>
                  <p className="text-sm text-blue-800">{getMembershipDescription(formData.membershipLevel)}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Pod Name</label>
                <Input
                  value={formData.podName}
                  onChange={(e) => handleInputChange('podName', e.target.value)}
                  placeholder="Bay Area Fitness Pod"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Pod Description</label>
                <Textarea
                  value={formData.podDescription}
                  onChange={(e) => handleInputChange('podDescription', e.target.value)}
                  placeholder="Share your pod's focus, schedule, and what makes it special..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Fee per Member</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="number"
                      value={formData.monthlyFee}
                      onChange={(e) => handleInputChange('monthlyFee', e.target.value)}
                      placeholder="150"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Available Spots</label>
                  <Input
                    type="number"
                    value={formData.availableSpots}
                    onChange={(e) => handleInputChange('availableSpots', e.target.value)}
                    placeholder="3"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium">Payment Schedule</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.requirements.includes("Monthly Payment") 
                        ? "border-purple-500 bg-purple-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      const newRequirements = formData.requirements.filter(r => r !== "Annual Payment");
                      if (!formData.requirements.includes("Monthly Payment")) {
                        newRequirements.push("Monthly Payment");
                      }
                      setFormData(prev => ({...prev, requirements: newRequirements}));
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.requirements.includes("Monthly Payment")}
                      />
                      <span className="text-sm font-medium">Monthly Payment</span>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.requirements.includes("Annual Payment") 
                        ? "border-purple-500 bg-purple-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      const newRequirements = formData.requirements.filter(r => r !== "Monthly Payment");
                      if (!formData.requirements.includes("Annual Payment")) {
                        newRequirements.push("Annual Payment");
                      }
                      setFormData(prev => ({...prev, requirements: newRequirements}));
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.requirements.includes("Annual Payment")}
                      />
                      <span className="text-sm font-medium">Annual Payment</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(4)}
                  disabled={!canProceedStep3}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Requirements & Terms</CardTitle>
              <p className="text-muted-foreground">
                Set member requirements and review terms
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Pod Leader Responsibilities</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Manage membership payments and Bay Club account</li>
                  <li>• Communicate with pod members regularly</li>
                  <li>• Handle member onboarding and offboarding</li>
                  <li>• Maintain pod guidelines and standards</li>
                </ul>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreesToTerms}
                  onCheckedChange={(checked) => handleInputChange('agreesToTerms', checked)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the Terms of Service and Pod Leader Agreement
                </label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Create Pod
                  <ArrowRight className="w-4 h-4 ml-2" />
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {renderStep()}
      </div>
    </div>
  );
}