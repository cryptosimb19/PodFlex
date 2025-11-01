import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  membershipId: z.string().optional(),
  primaryClub: z.string().optional(),
  membershipLevel: z.string().optional(),
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

  const { data: authUser, isLoading: authLoading } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    values: authUser ? {
      firstName: authUser.firstName || '',
      lastName: authUser.lastName || '',
      phone: authUser.phone || '',
      membershipId: authUser.membershipId || '',
      primaryClub: authUser.primaryClub || '',
      membershipLevel: authUser.membershipLevel || '',
      street: authUser.street || '',
      aptUnit: authUser.aptUnit || '',
      city: authUser.city || '',
      state: authUser.state || '',
      zipCode: authUser.zipCode || '',
      country: authUser.country || 'USA',
      dateOfBirth: authUser.dateOfBirth || '',
    } : undefined,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
      navigate('/dashboard');
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
      <Navigation userType={authUser?.userType || 'pod_seeker'} />
      <div className="max-w-3xl mx-auto p-4 pt-20">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          <Input {...field} placeholder="(123) 456-7890" data-testid="input-phone" />
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
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-date-of-birth" />
                        </FormControl>
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
                          <Input {...field} placeholder="BC-123456" data-testid="input-membership-id" />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-primary-club">
                              <SelectValue placeholder="Select your primary club" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bay Club Courtside">Bay Club Courtside</SelectItem>
                            <SelectItem value="Bay Club Marin">Bay Club Marin</SelectItem>
                            <SelectItem value="Bay Club Redwood Shores">Bay Club Redwood Shores</SelectItem>
                            <SelectItem value="Bay Club San Francisco">Bay Club San Francisco</SelectItem>
                            <SelectItem value="Bay Club Santa Clara">Bay Club Santa Clara</SelectItem>
                            <SelectItem value="Bay Club StoneTree">Bay Club StoneTree</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="membershipLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-membership-level">
                              <SelectValue placeholder="Select membership level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Single Club">Single Club</SelectItem>
                            <SelectItem value="Multi-Club">Multi-Club</SelectItem>
                            <SelectItem value="Family">Family</SelectItem>
                            <SelectItem value="Corporate">Corporate</SelectItem>
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
                            <Input {...field} placeholder="123 Main St" data-testid="input-street" />
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
                            <Input {...field} placeholder="Apt 4B" data-testid="input-apt-unit" />
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
                            <Input {...field} placeholder="San Francisco" data-testid="input-city" />
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
                            <Input {...field} placeholder="CA" data-testid="input-state" />
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
                            <Input {...field} placeholder="94102" data-testid="input-zip-code" />
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
                    onClick={() => navigate('/dashboard')}
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
                      'Save Changes'
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
