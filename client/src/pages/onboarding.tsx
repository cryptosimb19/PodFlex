import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { Accessibility, Search, MapPin } from "lucide-react";

interface UserPreferences {
  mobilityAssistance: boolean;
  visualImpairment: boolean;
  hearingImpairment: boolean;
  cognitiveSupport: boolean;
  location?: string;
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [preferences, setPreferences] = useState<UserPreferences>({
    mobilityAssistance: false,
    visualImpairment: false,
    hearingImpairment: false,
    cognitiveSupport: false,
  });
  const [, navigate] = useLocation();
  const { savePreferences } = useUserPreferences();

  const handlePreferenceChange = (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    try {
      await savePreferences(preferences);
      navigate("/search");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      // Still navigate to search even if saving fails
      navigate("/search");
    }
  };

  const handleEnableLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPreferences(prev => ({ ...prev, location: `${position.coords.latitude},${position.coords.longitude}` }));
          handleFinish();
        },
        (error) => {
          console.error("Location access denied:", error);
          handleFinish();
        }
      );
    } else {
      handleFinish();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="min-h-screen bg-gradient-to-br from-primary to-blue-600 flex flex-col items-center justify-center px-6 text-white fade-in">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                <Accessibility className="w-12 h-12" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome to FlexAccess</h1>
              <p className="text-lg text-blue-100 max-w-sm">Find accessible pods and locations that meet your specific needs</p>
              
              <div className="space-y-3 mt-8">
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <i className="fas fa-wheelchair text-xl"></i>
                  <span className="text-left">Wheelchair accessible entrances</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <i className="fas fa-eye text-xl"></i>
                  <span className="text-left">Visual accessibility features</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <i className="fas fa-volume-up text-xl"></i>
                  <span className="text-left">Audio accessibility support</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 w-full max-w-sm">
              <Button 
                onClick={() => setCurrentStep(2)}
                className="w-full bg-white text-primary font-semibold py-4 px-6 rounded-xl touch-target hover:bg-neutral-100 transition-colors"
              >
                Get Started
              </Button>
              <div className="flex justify-center space-x-2 mt-6">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                <div className="w-2 h-2 bg-white/40 rounded-full"></div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="min-h-screen bg-gradient-to-br from-secondary to-green-600 flex flex-col items-center justify-center px-6 text-white fade-in">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-12 h-12" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Personalized Search</h1>
              <p className="text-lg text-green-100 max-w-sm">Tell us about your accessibility needs for better recommendations</p>
              
              <div className="space-y-3 mt-8">
                <label className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 cursor-pointer touch-target">
                  <Checkbox 
                    checked={preferences.mobilityAssistance}
                    onCheckedChange={(checked) => handlePreferenceChange('mobilityAssistance', checked as boolean)}
                    className="border-white text-white"
                  />
                  <span className="text-left">Mobility assistance required</span>
                </label>
                <label className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 cursor-pointer touch-target">
                  <Checkbox 
                    checked={preferences.visualImpairment}
                    onCheckedChange={(checked) => handlePreferenceChange('visualImpairment', checked as boolean)}
                    className="border-white text-white"
                  />
                  <span className="text-left">Visual impairment support</span>
                </label>
                <label className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 cursor-pointer touch-target">
                  <Checkbox 
                    checked={preferences.hearingImpairment}
                    onCheckedChange={(checked) => handlePreferenceChange('hearingImpairment', checked as boolean)}
                    className="border-white text-white"
                  />
                  <span className="text-left">Hearing impairment support</span>
                </label>
                <label className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 cursor-pointer touch-target">
                  <Checkbox 
                    checked={preferences.cognitiveSupport}
                    onCheckedChange={(checked) => handlePreferenceChange('cognitiveSupport', checked as boolean)}
                    className="border-white text-white"
                  />
                  <span className="text-left">Cognitive support needed</span>
                </label>
              </div>
            </div>
            
            <div className="mt-12 w-full max-w-sm space-y-4">
              <Button 
                onClick={() => setCurrentStep(3)}
                className="w-full bg-white text-secondary font-semibold py-4 px-6 rounded-xl touch-target hover:bg-neutral-100 transition-colors"
              >
                Continue
              </Button>
              <Button 
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="w-full bg-transparent border-2 border-white text-white font-semibold py-4 px-6 rounded-xl touch-target hover:bg-white/10 transition-colors"
              >
                Back
              </Button>
              <div className="flex justify-center space-x-2 mt-6">
                <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white/40 rounded-full"></div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="min-h-screen bg-gradient-to-br from-accent to-orange-600 flex flex-col items-center justify-center px-6 text-white fade-in">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="w-12 h-12" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Location Services</h1>
              <p className="text-lg text-orange-100 max-w-sm">Enable location access to find accessible pods near you</p>
              
              <div className="space-y-3 mt-8">
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <i className="fas fa-crosshairs text-xl"></i>
                  <span className="text-left">Find nearby accessible locations</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <i className="fas fa-route text-xl"></i>
                  <span className="text-left">Get accessibility-focused directions</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3">
                  <i className="fas fa-clock text-xl"></i>
                  <span className="text-left">Real-time availability updates</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 w-full max-w-sm space-y-4">
              <Button 
                onClick={handleEnableLocation}
                className="w-full bg-white text-accent font-semibold py-4 px-6 rounded-xl touch-target hover:bg-neutral-100 transition-colors"
              >
                Enable Location & Start
              </Button>
              <Button 
                onClick={handleFinish}
                variant="outline"
                className="w-full bg-transparent border-2 border-white text-white font-semibold py-4 px-6 rounded-xl touch-target hover:bg-white/10 transition-colors"
              >
                Skip for Now
              </Button>
              <div className="flex justify-center space-x-2 mt-6">
                <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderStep();
}
