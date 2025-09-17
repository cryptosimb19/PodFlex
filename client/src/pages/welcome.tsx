import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users, DollarSign, Shield, ArrowRight, CheckCircle } from "lucide-react";

export default function Welcome() {
  const [, navigate] = useLocation();
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Connect with Members",
      description: "Find trustworthy Bay Club members to share membership costs"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Save Money",
      description: "Cut your membership costs by up to 75% through pod sharing"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure & Safe",
      description: "Verified members only, with secure payment handling"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8 fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform button-glow">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 gradient-text">FlexPod</h1>
          <p className="text-lg text-gray-600 font-medium">Fun is better when Shared</p>
        </div>



        {/* Rotating Features */}
        <Card className="mb-8 border-none shadow-lg bg-white/80 backdrop-blur-sm hover-lift card-transition">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 transition-all duration-500 fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform">
                <div className="text-purple-600">
                  {features[currentFeature].icon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1 text-lg">
                  {features[currentFeature].title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {features[currentFeature].description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Main CTA - Sign In/Get Started */}
        <div className="space-y-4 mb-6">
          <a
            href="/api/login"
            className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform button-glow"
          >
            Continue with Replit
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </a>
          
          <p className="text-sm text-gray-600 text-center">
            New to FlexPod? No problem! Just sign in and we'll get you started.
          </p>
        </div>


      </div>
    </div>
  );
}