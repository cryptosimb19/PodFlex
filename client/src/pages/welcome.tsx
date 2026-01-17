import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Users, DollarSign, Shield, ArrowRight, MapPin, Search, X, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Pod } from "@shared/schema";

const PODS_PER_PAGE = 9;
const GUEST_POD_LIMIT = 10;

export default function Welcome() {
  const [, navigate] = useLocation();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [showPods, setShowPods] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(PODS_PER_PAGE);
  const { isAuthenticated } = useAuth();

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

  // Fetch pods for browsing
  const { data: pods, isLoading: podsLoading } = useQuery<Pod[]>({
    queryKey: ['/api/pods'],
    queryFn: async () => {
      const response = await fetch('/api/pods');
      if (!response.ok) throw new Error('Failed to fetch pods');
      return response.json();
    },
    enabled: showPods,
  });

  // Filter pods based on search query
  const filteredPods = pods?.filter(pod => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const address = pod.clubAddress?.toLowerCase() || "";
    const region = pod.clubRegion?.toLowerCase() || "";
    const name = pod.clubName?.toLowerCase() || "";
    
    return address.includes(query) || region.includes(query) || name.includes(query);
  }) || [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const clearSearch = () => {
    setSearchQuery("");
    setDisplayLimit(PODS_PER_PAGE);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDisplayLimit(PODS_PER_PAGE);
  };

  const loadMore = () => {
    setDisplayLimit(prev => prev + PODS_PER_PAGE);
  };

  // For guests, limit to GUEST_POD_LIMIT pods
  const maxPods = isAuthenticated ? filteredPods.length : Math.min(filteredPods.length, GUEST_POD_LIMIT);
  const displayedPods = filteredPods.slice(0, Math.min(displayLimit, maxPods));
  const hasMorePods = isAuthenticated 
    ? filteredPods.length > displayLimit 
    : false; // Guests can't load more
  const guestLimitReached = !isAuthenticated && filteredPods.length > GUEST_POD_LIMIT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8 fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform button-glow">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 gradient-text">FlexPod</h1>
          <p className="text-lg text-gray-600 font-medium">Fun is better when Shared</p>
        </div>

        {/* Rotating Features */}
        <div className="max-w-md mx-auto mb-8">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover-lift card-transition">
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
        </div>

        {/* Main CTA - Sign In/Get Started */}
        <div className="max-w-md mx-auto space-y-4 mb-8">
          <a
            href="/login"
            className="inline-flex items-center justify-center w-full px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform button-glow"
            data-testid="button-sign-in"
          >
            Sign in or Sign up
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </a>
          
          <p className="text-sm text-gray-600 text-center">
            New to FlexPod? No problem! Just sign in and we'll get you started.
          </p>
        </div>

        {/* Browse Pods Section */}
        <div className="border-t border-gray-200 pt-8 mt-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Explore Available Pods</h2>
            <p className="text-gray-600">Browse pods in your area before signing up</p>
          </div>

          {!showPods ? (
            <div className="max-w-md mx-auto">
              <Button
                onClick={() => setShowPods(true)}
                variant="outline"
                className="w-full py-6 text-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
                data-testid="button-browse-pods"
              >
                <Search className="w-5 h-5 mr-2" />
                Browse Pods Near You
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search and Filter Section */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by city, state, zip code, or club name..."
                    className="pl-10 pr-10 py-6 text-lg"
                    data-testid="input-search-pods"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      data-testid="button-clear-search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Try searching: "San Francisco", "San Jose", "94105", or "Bay Club"
                </p>
              </div>

              {/* Pods Grid */}
              {podsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading pods...</p>
                </div>
              ) : filteredPods.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "No pods found" : "No pods available"}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery 
                      ? "Try adjusting your search or check back later." 
                      : "Check back soon for new pods in your area."}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedPods.map((pod) => (
                      <Card 
                        key={pod.id} 
                        className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                        onClick={() => navigate(`/pods/${pod.id}`)}
                        data-testid={`pod-card-${pod.id}`}
                      >
                        {pod.imageUrl && (
                          <div className="w-full h-32 overflow-hidden">
                            <img
                              src={pod.imageUrl}
                              alt={pod.title}
                              className="w-full h-full object-cover"
                              data-testid={`pod-image-${pod.id}`}
                            />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{pod.title}</CardTitle>
                            {pod.availableSpots > 0 ? (
                              <Badge className="bg-green-100 text-green-800">
                                {pod.availableSpots} spots
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Full</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="font-medium text-purple-600">{pod.clubName}</p>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{pod.clubAddress}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <Badge variant="outline">{pod.clubRegion}</Badge>
                              <span className="font-semibold text-gray-900">
                                ${pod.costPerPerson}/mo
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                              {pod.description}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full mt-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pods/${pod.id}`);
                            }}
                            data-testid={`button-view-pod-${pod.id}`}
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {hasMorePods && (
                    <div className="text-center">
                      <Button
                        onClick={loadMore}
                        variant="outline"
                        className="px-8 py-6 text-lg border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
                        data-testid="button-load-more"
                      >
                        Load More ({filteredPods.length - displayLimit} more pods)
                      </Button>
                    </div>
                  )}

                  {guestLimitReached && (
                    <div className="text-center py-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
                      <Lock className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Want to see more pods?
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Sign up for free to browse all {filteredPods.length} available pods and request to join!
                      </p>
                      <Button
                        onClick={() => navigate('/login')}
                        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all"
                        data-testid="button-signup-see-more"
                      >
                        Sign Up to See More
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* CTA to Sign Up */}
              {filteredPods.length > 0 && (
                <div className="text-center py-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    Found a pod you like? Sign up to request to join!
                  </p>
                  <a
                    href="/login"
                    className="inline-flex items-center px-6 py-3 text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg shadow-md hover:shadow-lg transition-all"
                    data-testid="button-sign-up-cta"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
