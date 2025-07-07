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
  
  // Membership Info
  membershipId: string;
  membershipType: string;
  clubLocation: string;
  
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
    membershipId: "",
    membershipType: "",
    clubLocation: "",
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
    setFormData(prev => ({ ...prev, [key]: value }));
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
    // In a real app, this would create the pod and save to backend
    console.log("Pod Leader Registration Data:", formData);
    navigate("/pods");
  };

  const totalSteps = 4;

  const canProceedStep1 = formData.firstName && formData.lastName && formData.email && formData.phone;
  const canProceedStep2 = formData.membershipId && formData.membershipType && formData.clubLocation;
  const canProceedStep3 = formData.podName && formData.podDescription && formData.monthlyFee && formData.availableSpots && formData.startDate;
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
                Verify your existing membership details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bay Club Membership ID</label>
                <Input
                  value={formData.membershipId}
                  onChange={(e) => handleInputChange('membershipId', e.target.value)}
                  placeholder="BC123456"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Found on your Bay Club membership card or app
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Membership Type</label>
                <Select value={formData.membershipType} onValueChange={(value) => handleInputChange('membershipType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select membership type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single-Club">Single-Club</SelectItem>
                    <SelectItem value="Multi-Club">Multi-Club</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Club Location</label>
                <Select value={formData.clubLocation} onValueChange={(value) => handleInputChange('clubLocation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Courtside">Courtside (San Jose)</SelectItem>
                    <SelectItem value="Redwood Shores">Redwood Shores</SelectItem>
                    <SelectItem value="San Francisco">San Francisco</SelectItem>
                    <SelectItem value="Walnut Creek">Walnut Creek</SelectItem>
                    <SelectItem value="Marin">Marin</SelectItem>
                    <SelectItem value="Santa Clara">Santa Clara</SelectItem>
                    <SelectItem value="Los Gatos">Los Gatos</SelectItem>
                    <SelectItem value="Fremont">Fremont</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="space-y-3">
                <label className="text-sm font-medium">Member Requirements (Optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Background Check",
                    "Deposit Required",
                    "Minimum Age 21",
                    "Local Residents Only",
                    "Active Lifestyle",
                    "Professional References"
                  ].map((requirement) => (
                    <div key={requirement} className="flex items-center space-x-2">
                      <Checkbox
                        id={requirement}
                        checked={formData.requirements.includes(requirement)}
                        onCheckedChange={() => handleRequirementToggle(requirement)}
                      />
                      <label
                        htmlFor={requirement}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {requirement}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
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