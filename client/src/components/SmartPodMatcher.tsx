import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, MapPin, DollarSign, Users, Star, ArrowRight, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import type { Pod } from "@shared/schema";

interface MatchedPod extends Pod {
  explanation: string;
  score: number;
}

const AMENITY_OPTIONS = [
  "Tennis", "Pickleball", "Pool", "Spa", "Gym", "Basketball", "Squash",
  "Yoga", "Cycling", "Cardio", "Weights", "Sauna", "Steam Room"
];

const BAY_AREA_REGIONS = [
  "San Francisco", "San Jose", "East Bay", "Peninsula", "Marin",
  "South Bay", "North Bay", "Sacramento"
];

const MEMBERSHIP_TYPES = ["Single-Club", "Multi-Club", "Family"];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-orange-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8">{score}%</span>
    </div>
  );
}

export default function SmartPodMatcher() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [maxBudget, setMaxBudget] = useState<number[]>([300]);
  const [membershipType, setMembershipType] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<MatchedPod[] | null>(null);

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/match-pods", {
        region: region || undefined,
        city: city || undefined,
        zipCode: zipCode || undefined,
        maxBudget: maxBudget[0],
        membershipType: membershipType || undefined,
        amenities: selectedAmenities.length ? selectedAmenities : undefined,
        notes: notes || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data.matches ?? []);
      if ((data.matches ?? []).length === 0) {
        toast({ title: "No matches found", description: "Try broadening your preferences." });
      }
    },
    onError: () => {
      toast({ title: "Matching failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleReset = () => {
    setResults(null);
    setRegion("");
    setCity("");
    setZipCode("");
    setMaxBudget([300]);
    setMembershipType("");
    setSelectedAmenities([]);
    setNotes("");
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-lg">
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span>AI Pod Matcher</span>
            <Badge className="bg-purple-500 text-white text-xs ml-1">New</Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Find your perfect pod
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        {!isOpen && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tell us your preferences and AI will find the best-fit pods for you.
          </p>
        )}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-5 pt-0">
          {results === null ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share your preferences below and our AI will recommend the best pods for you.
              </p>

              {/* Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Region</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Any region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any region</SelectItem>
                      {BAY_AREA_REGIONS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">City</Label>
                  <Input
                    placeholder="e.g. Palo Alto"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">ZIP Code</Label>
                  <Input
                    placeholder="e.g. 94301"
                    value={zipCode}
                    onChange={e => setZipCode(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Budget */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Max Monthly Budget: <span className="text-purple-600 font-bold ml-1">${maxBudget[0]}/mo</span>
                </Label>
                <Slider
                  value={maxBudget}
                  onValueChange={setMaxBudget}
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
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Membership Type</Label>
                <Select value={membershipType} onValueChange={setMembershipType}>
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

              {/* Amenities */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
                  Desired Amenities <span className="font-normal text-gray-400">(optional)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(amenity => (
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

              {/* Additional notes */}
              <div>
                <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                  Additional Preferences <span className="font-normal text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  placeholder="e.g. I prefer early morning availability, need family-friendly facilities, looking for a small group..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <Button
                onClick={() => matchMutation.mutate()}
                disabled={matchMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                {matchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finding your best matches...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Find My Best Pods
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {results.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {results.length} best match{results.length !== 1 ? "es" : ""} found
                    </p>
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs text-purple-600 h-7">
                      Search Again
                    </Button>
                  </div>

                  {results.map((pod, idx) => (
                    <div
                      key={pod.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {idx === 0 && (
                              <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {pod.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {pod.city || pod.clubRegion}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${pod.costPerPerson.toLocaleString()}/mo
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {pod.availableSpots} spot{pod.availableSpots !== 1 ? "s" : ""} left
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0 border-purple-200 text-purple-600">
                          {pod.membershipType}
                        </Badge>
                      </div>

                      <ScoreBar score={pod.score} />

                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic leading-relaxed">
                        "{pod.explanation}"
                      </p>

                      <Button
                        size="sm"
                        className="mt-3 w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        onClick={() => navigate(`/pods/${pod.id}`)}
                      >
                        View Pod <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    No pods matched your preferences. Try widening your search.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Try Different Preferences
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
