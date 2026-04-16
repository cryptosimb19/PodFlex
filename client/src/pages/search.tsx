import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import Navigation from "@/components/Navigation";
import {
  Search,
  MapPin,
  Users,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Pod } from "@shared/schema";

const MEMBERSHIP_TYPES = [
  "Club West Gold",
  "Executive Club East Bay",
  "Executive Club LA",
  "Executive Club North Bay",
  "Executive Club South Bay",
  "Executive Club Southern CA",
  "Single Site",
  "Executive Club Bay Area",
  "Premium",
  "Single-Club",
];

const BAY_AREA_REGIONS = [
  "San Francisco",
  "San Jose",
  "East Bay",
  "Peninsula",
  "Marin",
  "South Bay",
  "North Bay",
  "Sacramento",
];

const AMENITY_OPTIONS = [
  "Tennis",
  "Pickleball",
  "Pool",
  "Spa",
  "Gym",
  "Basketball",
  "Squash",
  "Yoga",
  "Cycling",
  "Cardio",
  "Weights",
  "Sauna",
  "Steam Room",
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [region, setRegion] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [maxBudget, setMaxBudget] = useState<number[]>([300]);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [selectedMembershipType, setSelectedMembershipType] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [, navigate] = useLocation();

  const { data: allPods = [], isLoading } = useQuery<Pod[]>({
    queryKey: ["/api/pods"],
    queryFn: async () => {
      const res = await fetch("/api/pods");
      return res.json();
    },
  });

  const filteredPods = useMemo(() => {
    let result = allPods.filter((p) => p.isActive && !p.deletedAt);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.clubName.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.clubRegion?.toLowerCase().includes(q)
      );
    }

    if (region) {
      result = result.filter((p) =>
        p.clubRegion?.toLowerCase().includes(region.toLowerCase())
      );
    }

    if (cityFilter.trim()) {
      const c = cityFilter.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.city?.toLowerCase().includes(c) ||
          p.clubRegion?.toLowerCase().includes(c)
      );
    }

    if (zipFilter.trim()) {
      result = result.filter((p) => p.zipCode?.includes(zipFilter.trim()));
    }

    if (budgetEnabled) {
      result = result.filter((p) => p.costPerPerson <= maxBudget[0]);
    }

    if (selectedMembershipType) {
      result = result.filter((p) => p.membershipType === selectedMembershipType);
    }

    if (selectedAmenities.length > 0) {
      result = result.filter((p) =>
        selectedAmenities.every((a) =>
          p.amenities?.some((pa) => pa.toLowerCase() === a.toLowerCase())
        )
      );
    }

    return result;
  }, [
    allPods,
    searchQuery,
    region,
    cityFilter,
    zipFilter,
    maxBudget,
    budgetEnabled,
    selectedMembershipType,
    selectedAmenities,
  ]);

  const activeFilterCount = [
    region,
    cityFilter.trim(),
    zipFilter.trim(),
    budgetEnabled ? "budget" : "",
    selectedMembershipType,
    ...selectedAmenities,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setRegion("");
    setCityFilter("");
    setZipFilter("");
    setMaxBudget([300]);
    setBudgetEnabled(false);
    setSelectedMembershipType("");
    setSelectedAmenities([]);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const userType = (
    localStorage.getItem("flexpod_user_type") === "pod_leader"
      ? "pod_leader"
      : "pod_seeker"
  ) as "pod_seeker" | "pod_leader";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation userType={userType} />

      {/* Sticky search bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search pods, clubs, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* SmartPodMatcher-style filter card */}
        <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-lg">
          <CardHeader className="pb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between text-left"
            >
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SlidersHorizontal className="w-4 h-4 text-white" />
                </div>
                <span>Filter Pods</span>
                {activeFilterCount > 0 && (
                  <Badge className="bg-purple-500 text-white text-xs ml-1">
                    {activeFilterCount} active
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Refine your search
                </span>
                {showFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>
            {!showFilters && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Filter by region, budget, membership type, and amenities.
              </p>
            )}
          </CardHeader>

          {showFilters && (
            <CardContent className="space-y-5 pt-0">

              {/* Location row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Region
                  </Label>
                  <Select
                    value={region || "any"}
                    onValueChange={(v) => setRegion(v === "any" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Any region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any region</SelectItem>
                      {BAY_AREA_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    City
                  </Label>
                  <Input
                    placeholder="e.g. Palo Alto"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    ZIP Code
                  </Label>
                  <Input
                    placeholder="e.g. 94301"
                    value={zipFilter}
                    onChange={(e) => setZipFilter(e.target.value)}
                    className="h-9 text-sm"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Max Monthly Budget:{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                    ${maxBudget[0]}/mo
                  </span>
                </Label>
                <Slider
                  value={maxBudget}
                  onValueChange={(v) => {
                    setMaxBudget(v);
                    setBudgetEnabled(true);
                  }}
                  min={50}
                  max={600}
                  step={10}
                  className="py-1"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>$50</span>
                  <span>$600</span>
                </div>
              </div>

              {/* Membership type */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                  Membership Type
                </Label>
                <Select
                  value={selectedMembershipType || "any"}
                  onValueChange={(v) =>
                    setSelectedMembershipType(v === "any" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any type</SelectItem>
                    {MEMBERSHIP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amenities */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                  Desired Amenities{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        selectedAmenities.includes(amenity)
                          ? "bg-purple-500 text-white border-purple-500"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-purple-300"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-red-500 h-7 px-0"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear all filters
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
            <p className="text-gray-500 mt-4 text-sm">Loading pods...</p>
          </div>
        ) : filteredPods.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
              No pods found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {activeFilterCount > 0 || searchQuery
                ? "Try adjusting your filters or search terms"
                : "No pods available right now"}
            </p>
            {(activeFilterCount > 0 || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearFilters();
                  setSearchQuery("");
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {filteredPods.length}
              </span>{" "}
              pod{filteredPods.length !== 1 ? "s" : ""} found
            </p>
            <div className="space-y-3">
              {filteredPods.map((pod) => (
                <Card
                  key={pod.id}
                  className="cursor-pointer hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  onClick={() => navigate(`/pods/${pod.id}`)}
                >
                  <div className="flex">
                    {pod.imageUrl ? (
                      <div className="w-28 sm:w-40 flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={pod.imageUrl}
                          alt={pod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-28 sm:w-40 flex-shrink-0 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                        <Users className="w-8 h-8 text-purple-300 dark:text-purple-600" />
                      </div>
                    )}

                    <CardContent className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate group-hover:text-purple-600 transition-colors">
                            {pod.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3 h-3 mr-0.5 flex-shrink-0" />
                              {[pod.city, pod.clubRegion]
                                .filter(Boolean)
                                .join(", ") || pod.clubName}
                            </span>
                            {pod.zipCode && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {pod.zipCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">
                            {formatPrice(pod.costPerPerson)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {pod.availableSpots} spot
                            {pod.availableSpots !== 1 ? "s" : ""} left
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-0"
                        >
                          {pod.membershipType}
                        </Badge>
                        {pod.amenities?.slice(0, 3).map((a) => (
                          <Badge
                            key={a}
                            variant="outline"
                            className="text-xs capitalize hidden sm:inline-flex"
                          >
                            {a.replace("_", " ")}
                          </Badge>
                        ))}
                        {(pod.amenities?.length ?? 0) > 3 && (
                          <Badge
                            variant="outline"
                            className="text-xs hidden sm:inline-flex"
                          >
                            +{(pod.amenities?.length ?? 0) - 3} more
                          </Badge>
                        )}
                      </div>

                      {pod.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-1 hidden sm:block">
                          {pod.description}
                        </p>
                      )}
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatPrice(amount: number) {
  return `$${amount.toLocaleString()}/mo`;
}
