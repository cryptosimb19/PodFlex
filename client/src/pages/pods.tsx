import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Users, DollarSign, Filter, Plus } from "lucide-react";
import type { Pod } from "@shared/schema";

export default function PodsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [, navigate] = useLocation();

  // Fetch pods from API
  const { data: pods = [], isLoading } = useQuery<Pod[]>({
    queryKey: ['/api/pods'],
    queryFn: async () => {
      const response = await fetch('/api/pods');
      if (!response.ok) {
        throw new Error('Failed to fetch pods');
      }
      return response.json();
    },
  });

  // Filter pods based on search and filters
  const filteredPods = pods.filter(pod => {
    const matchesSearch = !searchQuery || 
      pod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pod.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRegion = !selectedRegion || selectedRegion === 'all' || pod.clubRegion === selectedRegion;
    const matchesType = !selectedType || selectedType === 'all' || pod.membershipType === selectedType;
    
    return matchesSearch && matchesRegion && matchesType;
  });

  const formatPrice = (cents: number) => {
    return `$${Math.round(cents / 100)}`;
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "Multi-Club":
        return "bg-purple-100 text-purple-800";
      case "Single-Club":
        return "bg-blue-100 text-blue-800";
      case "Family":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const regions = ["San Jose", "San Francisco", "Peninsula", "Marin", "East Bay", "Santa Clara", "Los Angeles", "San Diego", "Washington", "Oregon"];
  const membershipTypes = ["Single-Club", "Multi-Club", "Family"];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading pods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FlexAccess</h1>
              <p className="text-sm text-gray-600">Fun is better when Shared</p>
            </div>
            <Button 
              onClick={() => navigate("/create-pod")}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Pod
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search pods, clubs, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-3 overflow-x-auto pb-2">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {membershipTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pod List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredPods.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pods found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or create a new pod
            </p>
            <Button onClick={() => navigate("/create-pod")}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Pod
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPods.map((pod) => (
              <Card 
                key={pod.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/pods/${pod.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {pod.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        {pod.clubName} • {pod.clubRegion}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(pod.costPerPerson)}
                        <span className="text-sm text-gray-600 font-normal">/month</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 line-clamp-2">
                    {pod.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={getBadgeColor(pod.membershipType)}>
                        {pod.membershipType}
                      </Badge>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-1" />
                        {pod.availableSpots} of {pod.totalSpots} spots available
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {pod.amenities?.slice(0, 3).map((amenity) => (
                        <Badge key={amenity} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {pod.amenities && pod.amenities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{pod.amenities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}