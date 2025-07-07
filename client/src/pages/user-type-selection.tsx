import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Users, Plus, ArrowRight } from "lucide-react";

export default function UserTypeSelection() {
  const [selectedType, setSelectedType] = useState<string>("");
  const [, navigate] = useLocation();

  const handleContinue = () => {
    if (selectedType === "join") {
      navigate("/onboarding?type=seeker");
    } else if (selectedType === "fill") {
      navigate("/pod-leader-registration");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FlexAccess</h1>
          <p className="text-gray-600">Fun is better when Shared</p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              selectedType === "join" 
                ? "ring-2 ring-purple-500 bg-purple-50 border-purple-200" 
                : "hover:shadow-md"
            }`}
            onClick={() => setSelectedType("join")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Join a Pod</CardTitle>
                  <p className="text-sm text-gray-600">Looking to share membership costs</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Save Money</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Quick Join</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Premium Access</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              selectedType === "fill" 
                ? "ring-2 ring-purple-500 bg-purple-50 border-purple-200" 
                : "hover:shadow-md"
            }`}
            onClick={() => setSelectedType("fill")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Plus className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Fill Your Pod</CardTitle>
                  <p className="text-sm text-gray-600">Have a membership, need members</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">
                Already have a Bay Club membership? Find trustworthy members to share costs and make your membership more affordable.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Reduce Costs</span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Lead Pod</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Manage Members</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <Button 
          onClick={handleContinue}
          disabled={!selectedType}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>


      </div>
    </div>
  );
}