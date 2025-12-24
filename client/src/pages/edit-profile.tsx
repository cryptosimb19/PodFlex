import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Navigation from "@/components/Navigation";
import { Loader2, ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { parseDate } from "chrono-node";

const editProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  membershipId: z.string().optional(),
  primaryClub: z.string().optional(),
  street: z.string().optional(),
  aptUnit: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [dateInputValue, setDateInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const { data: authUser, isLoading: authLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Sync date input value when user data loads
  useEffect(() => {
    if (authUser?.dateOfBirth) {
      try {
        const formatted = format(
          parse(authUser.dateOfBirth, "yyyy-MM-dd", new Date()),
          "MM/dd/yyyy",
        );
        setDateInputValue(formatted);
      } catch {
        setDateInputValue("");
      }
    }
  }, [authUser?.dateOfBirth]);

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    values: authUser
      ? {
          firstName: authUser.firstName || "",
          lastName: authUser.lastName || "",
          phone: authUser.phone || "",
          membershipId: authUser.membershipId || "",
          primaryClub: authUser.primaryClub || "",
          street: authUser.street || "",
          aptUnit: authUser.aptUnit || "",
          city: authUser.city || "",
          state: authUser.state || "",
          zipCode: authUser.zipCode || "",
          country: authUser.country || "USA",
          dateOfBirth: authUser.dateOfBirth || "",
        }
      : undefined,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType={authUser?.userType || "pod_seeker"} />
      <div className="max-w-3xl mx-auto p-4 pt-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="(123) 456-7890"
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <div className="relative flex">
                          <FormControl>
                            <Input
                              value={dateInputValue}
                              onChange={(e) => {
                                let val = e.target.value;
                                // Only allow digits and slashes
                                val = val.replace(/[^\d/]/g, "");
                                // Limit length
                                if (val.length > 10) val = val.slice(0, 10);
                                setDateInputValue(val);

                                if (val === "") {
                                  field.onChange("");
                                  return;
                                }
                                // Parse complete date
                                const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
                                const match = val.match(dateRegex);
                                if (match) {
                                  const [, month, day, year] = match;
                                  const yearNum = parseInt(year);
                                  const monthNum = parseInt(month);
                                  const dayNum = parseInt(day);
                                  // Validate date ranges
                                  if (
                                    yearNum >= 1920 &&
                                    yearNum <= new Date().getFullYear() - 18 &&
                                    monthNum >= 1 &&
                                    monthNum <= 12 &&
                                    dayNum >= 1 &&
                                    dayNum <= 31
                                  ) {
                                    field.onChange(`${year}-${month}-${day}`);
                                  }
                                }
                              }}
                              placeholder="mm/dd/yyyy"
                              className="pr-10"
                              data-testid="input-date-of-birth"
                            />
                          </FormControl>
                          <div className="relative flex gap-2">
                            <Input
                              id="date"
                              value={value}
                              placeholder="MM/DD/YYYY"
                              onChange={(e) => {
                                setValue(e.target.value);
                                const date = parseDate(e.target.value);
                                if (date) {
                                  const formatted = format(date, "MM/dd/yyyy");
                                  setDateInputValue(formatted);
                                  field.onChange(format(date, "yyyy-MM-dd"));
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
                                  <span className="sr-only">
                                    Select Date Of Birth
                                  </span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-64 overflow-hidden p-0"
                                align="end"
                              >
                                <Calendar
                                  mode="single"
                                  onSelect={(date) => {
                                    if (date) {
                                      setOpen(false);
                                      const formatted = format(
                                        date,
                                        "MM/dd/yyyy",
                                      );
                                      setValue(formatted)
                                      setDateInputValue(formatted);
                                      field.onChange(
                                        format(date, "yyyy-MM-dd"),
                                      );
                                    } else {
                                      setDateInputValue("");
                                      field.onChange("");
                                    }
                                  }}
                                  captionLayout="dropdown"
                                  defaultMonth={
                                    field.value
                                      ? parse(
                                          field.value,
                                          "yyyy-MM-dd",
                                          new Date(),
                                        )
                                      : undefined
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                id="dob"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-48 overflow-hidden p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                className="w-full"
                                onSelect={(date) => {
                                  if (date) {
                                    setOpen(false);
                                    const formatted = format(
                                      date,
                                      "MM/dd/yyyy",
                                    );
                                    setDateInputValue(formatted);
                                    field.onChange(format(date, "yyyy-MM-dd"));
                                  } else {
                                    setDateInputValue("");
                                    field.onChange("");
                                  }
                                }}
                                captionLayout="dropdown"
                                defaultMonth={
                                  field.value
                                    ? parse(
                                        field.value,
                                        "yyyy-MM-dd",
                                        new Date(),
                                      )
                                    : undefined
                                }
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="membershipId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bay Club Membership ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="BC-123456"
                            data-testid="input-membership-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryClub"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Club</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-primary-club">
                              <SelectValue placeholder="Select your primary club" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              San Francisco
                            </div>
                            <SelectItem value="Financial District">
                              Financial District
                            </SelectItem>
                            <SelectItem value="Gateway">Gateway</SelectItem>
                            <SelectItem value="San Francisco">
                              San Francisco
                            </SelectItem>
                            <SelectItem value="South San Francisco">
                              South San Francisco
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Marin
                            </div>
                            <SelectItem value="Marin">Marin</SelectItem>
                            <SelectItem value="StoneTree Golf Club">
                              StoneTree Golf Club
                            </SelectItem>
                            <SelectItem value="Rolling Hills">
                              Rolling Hills
                            </SelectItem>
                            <SelectItem value="Ross Valley">
                              Ross Valley
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              East Bay
                            </div>
                            <SelectItem value="Pleasanton">
                              Pleasanton
                            </SelectItem>
                            <SelectItem value="Fremont">Fremont</SelectItem>
                            <SelectItem value="Crow Canyon Country Club">
                              Crow Canyon Country Club
                            </SelectItem>
                            <SelectItem value="Walnut Creek">
                              Walnut Creek
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Peninsula
                            </div>
                            <SelectItem value="Broadway Tennis">
                              Broadway Tennis
                            </SelectItem>
                            <SelectItem value="Redwood Shores">
                              Redwood Shores
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Santa Clara
                            </div>
                            <SelectItem value="Santa Clara">
                              Santa Clara
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              San Jose
                            </div>
                            <SelectItem value="Boulder Ridge Golf Club">
                              Boulder Ridge Golf Club
                            </SelectItem>
                            <SelectItem value="Courtside">Courtside</SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Washington
                            </div>
                            <SelectItem value="PRO Club Seattle">
                              PRO Club Seattle
                            </SelectItem>
                            <SelectItem value="PRO Club Bellevue">
                              PRO Club Bellevue
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              San Diego
                            </div>
                            <SelectItem value="Carmel Valley">
                              Carmel Valley
                            </SelectItem>
                            <SelectItem value="Fairbanks Ranch Country Club">
                              Fairbanks Ranch Country Club
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Los Angeles
                            </div>
                            <SelectItem value="El Segundo">
                              El Segundo
                            </SelectItem>
                            <SelectItem value="Redondo Beach">
                              Redondo Beach
                            </SelectItem>
                            <SelectItem value="Santa Monica">
                              Santa Monica
                            </SelectItem>

                            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                              Oregon
                            </div>
                            <SelectItem value="Portland">Portland</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold">Address</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="123 Main St"
                              data-testid="input-street"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aptUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apt/Unit (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Apt 4B"
                              data-testid="input-apt-unit"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="San Francisco"
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="CA"
                              data-testid="input-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="94102"
                              data-testid="input-zip-code"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
