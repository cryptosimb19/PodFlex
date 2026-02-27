import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import {
  Search,
  Filter,
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

const MEMBERSHIP_TYPES = ["Single-Club", "Multi-Club", "Family"];

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:text-purple-900 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [zipFilter, setZipFilter] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [selectedMembershipType, setSelectedMembershipType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [, navigate] = useLocation();

  // Always fetch all pods and filter client-side
  const { data: allPods = [], isLoading } = useQuery<Pod[]>({
    queryKey: ["/api/pods"],
    queryFn: async () => {
      const res = await fetch("/api/pods");
      return res.json();
    },
  });

  // Client-side filtering — all filters are combinable
  const filteredPods = useMemo(() => {
    let result = allPods.filter(p => p.isActive && !p.deletedAt);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.clubName.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q)) ||
          (p.city?.toLowerCase().includes(q)) ||
          (p.clubRegion?.toLowerCase().includes(q))
      );
    }

    if (cityFilter.trim()) {
      const c = cityFilter.trim().toLowerCase();
      result = result.filter(p => p.city?.toLowerCase().includes(c) || p.clubRegion?.toLowerCase().includes(c));
    }

    if (zipFilter.trim()) {
      result = result.filter(p => p.zipCode?.includes(zipFilter.trim()));
    }

    if (minPrice !== "") {
      const minCents = parseFloat(minPrice) * 100;
      result = result.filter(p => p.costPerPerson >= minCents);
    }

    if (maxPrice !== "") {
      const maxCents = parseFloat(maxPrice) * 100;
      result = result.filter(p => p.costPerPerson <= maxCents);
    }

    if (selectedMembershipType) {
      result = result.filter(p => p.membershipType === selectedMembershipType);
    }

    return result;
  }, [allPods, searchQuery, cityFilter, zipFilter, minPrice, maxPrice, selectedMembershipType]);

  // Count active filters (excluding text search)
  const activeFilterCount = [
    cityFilter.trim(),
    zipFilter.trim(),
    minPrice,
    maxPrice,
    selectedMembershipType,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCityFilter("");
    setZipFilter("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedMembershipType("");
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toLocaleString()}/mo`;

  const userType = (
    localStorage.getItem("flexpod_user_type") === "pod_leader" ? "pod_leader" : "pod_seeker"
  ) as "pod_seeker" | "pod_leader";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation userType={userType} />

      {/* Search + Filter Toggle bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search pods, clubs, cities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 h-10 px-3 flex-shrink-0 ${
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
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="max-w-4xl mx-auto mt-2 flex flex-wrap gap-1.5 items-center">
            {cityFilter.trim() && (
              <ActiveFilterChip label={`City: ${cityFilter}`} onRemove={() => setCityFilter("")} />
            )}
            {zipFilter.trim() && (
              <ActiveFilterChip label={`ZIP: ${zipFilter}`} onRemove={() => setZipFilter("")} />
            )}
            {minPrice && (
              <ActiveFilterChip label={`Min: $${minPrice}/mo`} onRemove={() => setMinPrice("")} />
            )}
            {maxPrice && (
              <ActiveFilterChip label={`Max: $${maxPrice}/mo`} onRemove={() => setMaxPrice("")} />
            )}
            {selectedMembershipType && (
              <ActiveFilterChip
                label={selectedMembershipType}
                onRemove={() => setSelectedMembershipType("")}
              />
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="e.g. San Jose"
                    value={cityFilter}
                    onChange={e => setCityFilter(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  ZIP Code
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="e.g. 95112"
                    value={zipFilter}
                    onChange={e => setZipFilter(e.target.value)}
                    className="pl-8 h-9 text-sm"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Membership Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Membership Type
                </label>
                <Select value={selectedMembershipType} onValueChange={setSelectedMembershipType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any type</SelectItem>
                    {MEMBERSHIP_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price range */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Price Range ($/mo)
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      min={0}
                      className="pl-6 h-9 text-sm"
                    />
                  </div>
                  <span className="text-gray-400 text-sm flex-shrink-0">–</span>
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      min={0}
                      className="pl-6 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500 h-7">
                  <X className="w-3 h-3 mr-1" />
                  Clear all filters
                </Button>
              </div>
            )}
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">No pods found</h3>
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
              <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredPods.length}</span>{" "}
              pod{filteredPods.length !== 1 ? "s" : ""} found
            </p>
            <div className="space-y-3">
              {filteredPods.map(pod => (
                <Card
                  key={pod.id}
                  className="cursor-pointer hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  onClick={() => navigate(`/pods/${pod.id}`)}
                >
                  <div className="flex">
                    {/* Image thumbnail */}
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

                    {/* Content */}
                    <CardContent className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate group-hover:text-purple-600 transition-colors">
                            {pod.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3 h-3 mr-0.5 flex-shrink-0" />
                              {[pod.city, pod.clubRegion].filter(Boolean).join(", ") || pod.clubName}
                            </span>
                            {pod.zipCode && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">{pod.zipCode}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">
                            {formatPrice(pod.costPerPerson)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {pod.availableSpots} spot{pod.availableSpots !== 1 ? "s" : ""} left
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
                        {pod.amenities?.slice(0, 3).map(a => (
                          <Badge key={a} variant="outline" className="text-xs capitalize hidden sm:inline-flex">
                            {a.replace("_", " ")}
                          </Badge>
                        ))}
                        {(pod.amenities?.length ?? 0) > 3 && (
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
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
