import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import type { Pod } from "@shared/schema";

const MEMBERSHIP_TYPES = ["Single-Club", "Multi-Club", "Family"];

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
  const [maxBudget, setMaxBudget] = useState<number[]>([600]);
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
    setMaxBudget([600]);
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

      {/* Search bar + filter toggle */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search pods, clubs, cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg text-sm"
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 h-10 px-3 flex-shrink-0 transition-colors ${
              activeFilterCount > 0
                ? "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-900/30"
                : "border-gray-200 dark:border-gray-600"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* SmartPodMatcher-style filter panel */}
      {showFilters && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-4 py-5">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-purple-700 dark:text-purple-300 text-sm">
                  Filter Pods
                </span>
                {activeFilterCount > 0 && (
                  <Badge className="bg-purple-500 text-white text-xs">
                    {activeFilterCount} active
                  </Badge>
                )}
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-red-500 h-7"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Location row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
                  Region
                </Label>
                <Select
                  value={region || "any"}
                  onValueChange={(v) => setRegion(v === "any" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Any region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any region</SelectItem>
                    {BAY_AREA_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
                  City
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="e.g. Palo Alto"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="pl-8 h-9 text-sm bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
                  ZIP Code
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="e.g. 94301"
                    value={zipFilter}
                    onChange={(e) => setZipFilter(e.target.value)}
                    className="pl-8 h-9 text-sm bg-white dark:bg-gray-800"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Budget slider */}
            <div className="mb-4">
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Max Monthly Budget
                {budgetEnabled ? (
                  <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">
                    ${maxBudget[0]}/mo
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal ml-1">(any)</span>
                )}
              </Label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBudgetEnabled((v) => !v)}
                  className={`shrink-0 w-9 h-5 rounded-full transition-colors relative ${
                    budgetEnabled ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      budgetEnabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <div className="flex-1">
                  <Slider
                    value={maxBudget}
                    onValueChange={(v) => {
                      setMaxBudget(v);
                      setBudgetEnabled(true);
                    }}
                    min={50}
                    max={600}
                    step={10}
                    className={`py-1 ${!budgetEnabled ? "opacity-40" : ""}`}
                    disabled={!budgetEnabled}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>$50</span>
                    <span>$600</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Membership type */}
            <div className="mb-4">
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">
                Membership Type
              </Label>
              <Select
                value={selectedMembershipType || "any"}
                onValueChange={(v) =>
                  setSelectedMembershipType(v === "any" ? "" : v)
                }
              >
                <SelectTrigger className="h-9 text-sm bg-white dark:bg-gray-800 max-w-xs">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {MEMBERSHIP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amenities */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                Amenities{" "}
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
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
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
