import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Navigation from "@/components/Navigation";
import { Zap, Users, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { parseDate } from "chrono-node";

// Phone number formatting utilities
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");

  // Format based on length
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const stripPhoneFormatting = (value: string): string => {
  return value.replace(/\D/g, "");
};

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primaryCampus: string;
  primaryClub: string;
  membershipLevel: string;
  membershipId: string;
  street: string;
  aptUnit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
}

const formatDate = (date: Date | undefined) => {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
};

const isValidDate = (date: Date | undefined) => {
  if (!date) return false;
  return !isNaN(date.getTime());
};

export default function OnboardingWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1); // Will only have 1 step now
  const [userData, setUserData] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    primaryCampus: "",
    primaryClub: "",
    membershipLevel: "",
    membershipId: "",
    street: "",
    aptUnit: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    dateOfBirth: "",
  });
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [value, setValue] = useState("");
  const [, navigate] = useLocation();

  // Get user type from URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const userType = searchParams.get("type") || "seeker"; // 'seeker' or 'lead'

  // Fetch authenticated user data on mount and check if already onboarded
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        if (response.ok) {
          const user = await response.json();

          // If user has already completed onboarding, redirect to dashboard
          if (user.hasCompletedOnboarding && user.userType) {
            if (user.userType === "pod_leader") {
              navigate("/pod-leader-dashboard", { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
            return;
          }

          setUserData((prev) => ({
            ...prev,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
          }));
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    fetchUserData();
  }, [navigate]);

  // Helper functions for dynamic form options
  const getAvailableClubsForCampus = (campus: string) => {
    const clubsByCampus: Record<
      string,
      Array<{ value: string; label: string }>
    > = {
      "San Francisco": [
        { value: "Financial District", label: "Financial District" },
        { value: "Gateway", label: "Gateway" },
        { value: "San Francisco", label: "San Francisco" },
        { value: "South San Francisco", label: "South San Francisco" },
      ],
      Marin: [
        { value: "Marin", label: "Marin" },
        { value: "StoneTree Golf Club", label: "StoneTree Golf Club" },
        { value: "Rolling Hills", label: "Rolling Hills" },
        { value: "Ross Valley", label: "Ross Valley" },
      ],
      "East Bay": [
        { value: "Pleasanton", label: "Pleasanton" },
        { value: "Fremont", label: "Fremont" },
        {
          value: "Crow Canyon Country Club",
          label: "Crow Canyon Country Club",
        },
        { value: "Walnut Creek", label: "Walnut Creek" },
      ],
      Peninsula: [
        { value: "Broadway Tennis", label: "Broadway Tennis" },
        { value: "Redwood Shores", label: "Redwood Shores" },
      ],
      "Santa Clara": [{ value: "Santa Clara", label: "Santa Clara" }],
      "San Jose": [
        { value: "Boulder Ridge Golf Club", label: "Boulder Ridge Golf Club" },
        { value: "Courtside", label: "Courtside" },
      ],
      Washington: [
        { value: "PRO Club Seattle", label: "PRO Club Seattle" },
        { value: "PRO Club Bellevue", label: "PRO Club Bellevue" },
      ],
      "San Diego": [
        { value: "Carmel Valley", label: "Carmel Valley" },
        {
          value: "Fairbanks Ranch Country Club",
          label: "Fairbanks Ranch Country Club",
        },
      ],
      "Los Angeles": [
        { value: "El Segundo", label: "El Segundo" },
        { value: "Redondo Beach", label: "Redondo Beach" },
        { value: "Santa Monica", label: "Santa Monica" },
      ],
      Oregon: [{ value: "Portland", label: "Portland" }],
    };
    return clubsByCampus[campus] || [];
  };

  const getAvailableMembershipLevelsForClub = (club: string) => {
    const membershipsByClub: Record<
      string,
      Array<{ value: string; label: string; description: string }>
    > = {
      // San Jose
      "Boulder Ridge Golf Club": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
      ],
      Courtside: [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay access",
        },
      ],
      // East Bay
      Pleasanton: [
        {
          value: "East Bay Campus",
          label: "East Bay Campus",
          description: "East Bay locations + Crow Canyon CC",
        },
        {
          value: "Executive Club East Bay",
          label: "Executive Club East Bay",
          description: "East Bay + Tennis access",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Pleasanton only",
        },
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
      ],
      Fremont: [
        {
          value: "East Bay Campus",
          label: "East Bay Campus",
          description: "East Bay locations + Crow Canyon CC",
        },
        {
          value: "Executive Club East Bay",
          label: "Executive Club East Bay",
          description: "East Bay + Tennis access",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Fremont only",
        },
      ],
      "Crow Canyon Country Club": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "East Bay Campus",
          label: "East Bay Campus",
          description: "East Bay locations + Crow Canyon CC",
        },
        {
          value: "Executive Club East Bay",
          label: "Executive Club East Bay",
          description: "East Bay + Tennis access",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
      ],
      "Walnut Creek": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "East Bay Campus",
          label: "East Bay Campus",
          description: "East Bay locations + Crow Canyon CC",
        },
        {
          value: "Executive Club East Bay",
          label: "Executive Club East Bay",
          description: "East Bay + Tennis access",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Walnut Creek only",
        },
      ],
      // San Francisco
      "Financial District": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Financial District only",
        },
      ],
      Gateway: [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
      ],
      "San Francisco": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
      ],
      "South San Francisco": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
      ],
      // Peninsula
      "Broadway Tennis": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
      ],
      "Redwood Shores": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
      ],
      // Oregon
      Portland: [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Portland only",
        },
      ],
      // Los Angeles
      "El Segundo": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club LA",
          label: "Executive Club LA",
          description: "Los Angeles area locations",
        },
        {
          value: "Executive Club Southern CA",
          label: "Executive Club Southern CA",
          description: "Southern California locations",
        },
      ],
      "Redondo Beach": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club LA",
          label: "Executive Club LA",
          description: "Los Angeles area locations",
        },
        {
          value: "Executive Club Southern CA",
          label: "Executive Club Southern CA",
          description: "Southern California locations",
        },
      ],
      "Santa Monica": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club LA",
          label: "Executive Club LA",
          description: "Los Angeles area locations",
        },
        {
          value: "Executive Club Southern CA",
          label: "Executive Club Southern CA",
          description: "Southern California locations",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Santa Monica only",
        },
      ],
      // Santa Clara
      "Santa Clara": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club South Bay",
          label: "Executive Club South Bay",
          description: "South Bay + SF + East Bay",
        },
        {
          value: "Santa Clara Campus",
          label: "Santa Clara Campus",
          description: "Santa Clara campus locations",
        },
      ],
      // San Diego
      "Carmel Valley": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club Southern CA",
          label: "Executive Club Southern CA",
          description: "Southern California locations",
        },
      ],
      "Fairbanks Ranch Country Club": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
      ],
      // Washington
      "PRO Club Seattle": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "PRO Club Seattle only",
        },
        {
          value: "Campus",
          label: "Campus",
          description: "Washington campus locations",
        },
      ],
      "PRO Club Bellevue": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "PRO Club Bellevue only",
        },
        {
          value: "Campus",
          label: "Campus",
          description: "Washington campus locations",
        },
      ],
      // Marin
      Marin: [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
      ],
      "StoneTree Golf Club": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
      ],
      "Rolling Hills": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
        {
          value: "Executive Club North Bay",
          label: "Executive Club North Bay",
          description: "SF + Marin + East Bay markets",
        },
        {
          value: "Single Site",
          label: "Single Site",
          description: "Rolling Hills only",
        },
      ],
      "Ross Valley": [
        {
          value: "Club West Gold",
          label: "Club West Gold",
          description: "All Bay Club locations + 4-day sports booking",
        },
      ],
    };
    return membershipsByClub[club] || [];
  };

  const handleInputChange = (key: keyof UserData, value: string) => {
    setUserData((prev) => {
      // Reset dependent fields when campus or club changes
      if (key === "primaryCampus") {
        return { ...prev, [key]: value, primaryClub: "", membershipLevel: "" };
      }
      if (key === "primaryClub") {
        return { ...prev, [key]: value, membershipLevel: "" };
      }
      // Auto-format phone number for display
      if (key === "phone") {
        return { ...prev, [key]: formatPhoneNumber(value) };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleFinish = async () => {
    try {
      console.log("🔄 Saving profile to database...");

      // Update user profile with ALL membership information and mark onboarding as complete
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          membershipId: userData.membershipId || undefined,
          preferredRegion: userData.primaryCampus || undefined,
          primaryClub: userData.primaryClub || undefined,
          membershipLevel: userData.membershipLevel || undefined,
          phone: userData.phone
            ? stripPhoneFormatting(userData.phone)
            : undefined,
          street: userData.street || undefined,
          aptUnit: userData.aptUnit || undefined,
          city: userData.city || undefined,
          state: userData.state || undefined,
          zipCode: userData.zipCode || undefined,
          country: userData.country || undefined,
          dateOfBirth: userData.dateOfBirth || undefined,
          userType: "pod_seeker",
          hasCompletedOnboarding: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        console.error("❌ Failed to save profile to database:", errorData);
        toast({
          title: "Error",
          description: `Failed to save your profile: ${errorData.message}. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Profile saved successfully to database");

      // Parse the server's response which contains the updated user
      const updatedUser = await response.json();

      // ONLY set localStorage after database confirms save
      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("flexpod_onboarding_complete", "true");
      localStorage.setItem("flexpod_user_type", "pod_seeker");

      // Seed the cache directly from the server response — avoids any race condition
      // where an in-flight background refetch (started before the PUT) could overwrite
      // the cache with stale data right before we navigate.
      queryClient.setQueryData(["/api/auth/user"], updatedUser);

      // Cancel any in-flight /api/auth/user requests so they cannot overwrite the cache
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      console.log("🚀 Navigating to dashboard...");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("❌ Error during onboarding completion:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
  };

  // No step validation needed since we only have one step
  const canFinish =
    userData.primaryCampus &&
    userData.primaryClub &&
    userData.membershipLevel &&
    userData.phone &&
    userData.street &&
    userData.city &&
    userData.state &&
    userData.zipCode &&
    userData.country &&
    userData.dateOfBirth;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">
                {userType === "lead"
                  ? "Bay Club Membership Details"
                  : "Bay Club Membership"}
              </CardTitle>
              <p className="text-muted-foreground">
                Select the Location and Membership Level you are looking to join
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Campus</label>
                <Select
                  value={userData.primaryCampus}
                  onValueChange={(value) =>
                    handleInputChange("primaryCampus", value)
                  }
                >
                  <SelectTrigger data-testid="select-primary-campus">
                    <SelectValue placeholder="Select your primary campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="San Jose">San Jose</SelectItem>
                    <SelectItem value="East Bay">East Bay</SelectItem>
                    <SelectItem value="San Francisco">San Francisco</SelectItem>
                    <SelectItem value="Marin">Marin</SelectItem>
                    <SelectItem value="Washington">Washington</SelectItem>
                    <SelectItem value="San Diego">San Diego</SelectItem>
                    <SelectItem value="Peninsula">Peninsula</SelectItem>
                    <SelectItem value="Santa Clara">Santa Clara</SelectItem>
                    <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                    <SelectItem value="Oregon">Oregon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Club</label>
                <Select
                  value={userData.primaryClub}
                  onValueChange={(value) =>
                    handleInputChange("primaryClub", value)
                  }
                  disabled={!userData.primaryCampus}
                >
                  <SelectTrigger data-testid="select-primary-club">
                    <SelectValue
                      placeholder={
                        userData.primaryCampus
                          ? "Select your primary club"
                          : "Select campus first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableClubsForCampus(userData.primaryCampus).map(
                      (club) => (
                        <SelectItem key={club.value} value={club.value}>
                          {club.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Membership Level</label>
                <Select
                  value={userData.membershipLevel}
                  onValueChange={(value) =>
                    handleInputChange("membershipLevel", value)
                  }
                  disabled={!userData.primaryClub}
                >
                  <SelectTrigger data-testid="select-membership-level">
                    <SelectValue
                      placeholder={
                        userData.primaryClub
                          ? "Select membership level"
                          : "Select club first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableMembershipLevelsForClub(
                      userData.primaryClub,
                    ).map((membership) => (
                      <SelectItem
                        key={membership.value}
                        value={membership.value}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {membership.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {membership.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Bay Club Membership ID (Optional)
                </label>
                <Input
                  value={userData.membershipId}
                  onChange={(e) =>
                    handleInputChange("membershipId", e.target.value)
                  }
                  placeholder="BC123456"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Current Address</label>
                <div className="space-y-2">
                  <Input
                    value={userData.street}
                    onChange={(e) =>
                      handleInputChange("street", e.target.value)
                    }
                    placeholder="Street Address"
                    data-testid="input-street"
                  />
                  <Input
                    value={userData.aptUnit}
                    onChange={(e) =>
                      handleInputChange("aptUnit", e.target.value)
                    }
                    placeholder="Apt/Unit (Optional)"
                    data-testid="input-apt-unit"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={userData.city}
                      onChange={(e) =>
                        handleInputChange("city", e.target.value)
                      }
                      placeholder="City"
                      data-testid="input-city"
                    />
                    <Select
                      value={userData.state}
                      onValueChange={(value) =>
                        handleInputChange("state", value)
                      }
                    >
                      <SelectTrigger data-testid="select-state">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="AK">Alaska</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="AR">Arkansas</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                        <SelectItem value="DE">Delaware</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="GA">Georgia</SelectItem>
                        <SelectItem value="HI">Hawaii</SelectItem>
                        <SelectItem value="ID">Idaho</SelectItem>
                        <SelectItem value="IL">Illinois</SelectItem>
                        <SelectItem value="IN">Indiana</SelectItem>
                        <SelectItem value="IA">Iowa</SelectItem>
                        <SelectItem value="KS">Kansas</SelectItem>
                        <SelectItem value="KY">Kentucky</SelectItem>
                        <SelectItem value="LA">Louisiana</SelectItem>
                        <SelectItem value="ME">Maine</SelectItem>
                        <SelectItem value="MD">Maryland</SelectItem>
                        <SelectItem value="MA">Massachusetts</SelectItem>
                        <SelectItem value="MI">Michigan</SelectItem>
                        <SelectItem value="MN">Minnesota</SelectItem>
                        <SelectItem value="MS">Mississippi</SelectItem>
                        <SelectItem value="MO">Missouri</SelectItem>
                        <SelectItem value="MT">Montana</SelectItem>
                        <SelectItem value="NE">Nebraska</SelectItem>
                        <SelectItem value="NV">Nevada</SelectItem>
                        <SelectItem value="NH">New Hampshire</SelectItem>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="NM">New Mexico</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="NC">North Carolina</SelectItem>
                        <SelectItem value="ND">North Dakota</SelectItem>
                        <SelectItem value="OH">Ohio</SelectItem>
                        <SelectItem value="OK">Oklahoma</SelectItem>
                        <SelectItem value="OR">Oregon</SelectItem>
                        <SelectItem value="PA">Pennsylvania</SelectItem>
                        <SelectItem value="RI">Rhode Island</SelectItem>
                        <SelectItem value="SC">South Carolina</SelectItem>
                        <SelectItem value="SD">South Dakota</SelectItem>
                        <SelectItem value="TN">Tennessee</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        <SelectItem value="UT">Utah</SelectItem>
                        <SelectItem value="VT">Vermont</SelectItem>
                        <SelectItem value="VA">Virginia</SelectItem>
                        <SelectItem value="WA">Washington</SelectItem>
                        <SelectItem value="WV">West Virginia</SelectItem>
                        <SelectItem value="WI">Wisconsin</SelectItem>
                        <SelectItem value="WY">Wyoming</SelectItem>
                        <SelectItem value="DC">Washington DC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={userData.zipCode}
                      onChange={(e) =>
                        handleInputChange("zipCode", e.target.value)
                      }
                      placeholder="Zip Code"
                      data-testid="input-zip-code"
                    />
                    <Input
                      value={userData.country}
                      onChange={(e) =>
                        handleInputChange("country", e.target.value)
                      }
                      placeholder="Country"
                      data-testid="input-country"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label htmlFor="dob" className="text-sm font-medium">
                  Date of Birth
                </label>
                <div className="relative flex gap-2">
                  <Input
                    id="date"
                    value={value}
                    placeholder="MM/DD/YYYY"
                    onChange={(e) => {
                      setValue(e.target.value);
                      const date = parseDate(e.target.value);
                      if (date) {
                        handleInputChange(
                          "dateOfBirth",
                          format(date, "yyyy-MM-dd"),
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpen(true);
                      }
                    }}
                  />
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        id="dob"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="sr-only">Select Date Of Birth</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 overflow-hidden p-0"
                      align="end"
                    >
                      <Calendar
                        mode="single"
                        className="w-full"
                        onSelect={(date) => {
                          if (date) {
                            setDate(date);
                            setValue(format(date, "MM/dd/yyyy"));
                            setOpen(false);
                            handleInputChange(
                              "dateOfBirth",
                              format(date, "yyyy-MM-dd"),
                            );
                          } else {
                            handleInputChange("dateOfBirth", "");
                          }
                        }}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                onClick={handleFinish}
                disabled={!canFinish}
                className="w-full"
                data-testid="button-complete-registration"
              >
                Complete Registration
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation userType="pod_seeker" />
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        {renderStep()}

        {/* Progress indicator - Single step */}
        <div className="flex space-x-2 mt-6">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
