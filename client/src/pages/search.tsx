import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, MapPin, Users, DollarSign, Star } from "lucide-react";
import { useLocation } from "wouter";
import type { Pod } from "@shared/schema";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedMembershipType, setSelectedMembershipType] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [, navigate] = useLocation();

  // Fetch pods
  const { data: pods = [], isLoading, refetch } = useQuery<Pod[]>({
    queryKey: ['/api/pods', searchQuery, selectedRegion, selectedMembershipType, selectedAmenities],
    queryFn: async () => {
      // If we have filters, use the filter endpoint
      if (selectedRegion || selectedMembershipType || selectedAmenities.length > 0) {
        const response = await fetch('/api/pods/filter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region: selectedRegion || undefined,
            membershipType: selectedMembershipType || undefined,
            amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
          }),
        });
        return response.json();
      }
      
      // If we have a search query, use the search endpoint
      if (searchQuery.trim()) {
        const response = await fetch(`/api/pods/search/${encodeURIComponent(searchQuery)}`);
        return response.json();
      }
      
      // Otherwise get all pods
      const response = await fetch('/api/pods');
      return response.json();
    },
  });

  const regions = ["San Jose", "San Francisco", "Peninsula", "Marin", "East Bay", "Santa Clara", "Los Angeles", "San Diego", "Washington", "Oregon"];
  const membershipTypes = ["Single-Club", "Multi-Club", "Family"];
  const amenities = ["tennis", "pickleball", "pool", "spa", "gym", "kids_club", "sauna"];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    refetch();
  };

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const clearFilters = () => {
    setSelectedRegion("any");
    setSelectedMembershipType("any");
    setSelectedAmenities([]);
    setSearchQuery("");
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}/month`;
  };

  const handlePodClick = (podId: number) => {
    navigate(`/pod/${podId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FlexAccess</h1>
                <p className="text-sm text-gray-600">Fun is better when Shared</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-4 bg-white border-b">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for pods, clubs, or amenities..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-4 bg-white border-b space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Any region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any region</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Membership Type</label>
              <Select value={selectedMembershipType} onValueChange={setSelectedMembershipType}>
                <SelectTrigger>
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {membershipTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {amenities.map(amenity => (
                <Badge
                  key={amenity}
                  variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => handleAmenityToggle(amenity)}
                >
                  {amenity.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading pods...</p>
          </div>
        ) : pods.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No pods found matching your criteria</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Found {pods.length} pod{pods.length !== 1 ? 's' : ''} available
            </p>
            
            {pods.map(pod => (
              <Card 
                key={pod.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handlePodClick(pod.id)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {pod.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {pod.clubName}, {pod.clubRegion}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {pod.membershipType}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {formatPrice(pod.costPerPerson)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pod.availableSpots} of {pod.totalSpots} spots left
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                    {pod.description}
                  </p>

                  {pod.amenities && pod.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pod.amenities.slice(0, 4).map(amenity => (
                        <Badge key={amenity} variant="outline" className="text-xs capitalize">
                          {amenity.replace('_', ' ')}
                        </Badge>
                      ))}
                      {pod.amenities.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{pod.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}