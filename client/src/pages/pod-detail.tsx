import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Users, DollarSign, Calendar, CheckCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Pod, JoinRequest } from "@shared/schema";

export default function PodDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Fetch pod details
  const { data: pod, isLoading: podLoading } = useQuery<Pod>({
    queryKey: ['/api/pods', id],
    queryFn: async () => {
      const response = await fetch(`/api/pods/${id}`);
      if (!response.ok) throw new Error('Failed to fetch pod');
      return response.json();
    },
    enabled: !!id,
  });

  // Create join request mutation
  const joinMutation = useMutation({
    mutationFn: async (requestData: { message: string; userInfo: typeof userInfo }) => {
      const response = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podId: parseInt(id || '0'),
          userId: 1, // Mock user ID - in real app would come from auth
          message: requestData.message,
          userInfo: requestData.userInfo,
        }),
      });
      if (!response.ok) throw new Error('Failed to create join request');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Join request sent!",
        description: "The pod leader will review your request and get back to you.",
      });
      setIsJoinDialogOpen(false);
      setJoinMessage("");
      setUserInfo({ name: "", email: "", phone: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/pods', id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send join request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleJoinRequest = () => {
    if (!userInfo.name || !userInfo.email || !joinMessage) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    joinMutation.mutate({ message: joinMessage, userInfo });
  };

  const formatPrice = (cents: number) => {
    return `$${Math.round(cents / 100)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (podLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading pod details...</p>
        </div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pod not found</h1>
          <Button onClick={() => navigate("/pods")}>Back to Pods</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/pods")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pods
          </Button>
        </div>
      </div>

      {/* Pod Details */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{pod.title}</CardTitle>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span className="text-lg">{pod.clubName} • {pod.clubRegion}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary mb-1">
                  {formatPrice(pod.costPerPerson)}
                  <span className="text-lg text-muted-foreground font-normal">/month</span>
                </div>
                <Badge variant="secondary">{pod.membershipType}</Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-3">About This Pod</h3>
              <p className="text-muted-foreground leading-relaxed">
                {pod.description}
              </p>
            </div>

            <Separator />

            {/* Membership Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Membership Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Membership Type</span>
                    <Badge variant="outline">{pod.membershipType}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost per person</span>
                    <span className="font-semibold">{formatPrice(pod.costPerPerson)}/month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Available spots</span>
                    <span className="font-semibold">{pod.availableSpots} of {pod.totalSpots}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-semibold">{formatDate(pod.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Location & Access</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Club</span>
                    <span className="font-semibold">{pod.clubName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Region</span>
                    <span className="font-semibold">{pod.clubRegion}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-semibold">{pod.clubAddress}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            {pod.amenities && pod.amenities.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Available Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {pod.amenities.map((amenity) => (
                      <Badge key={amenity} variant="outline" className="capitalize">
                        {amenity.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Join Action */}
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Ready to Join?</h3>
                  <p className="text-muted-foreground">
                    Send a request to join this pod. The pod leader will review and respond to your request.
                  </p>
                </div>
                <div className="ml-6">
                  {pod.availableSpots > 0 ? (
                    <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                          <Send className="w-4 h-4 mr-2" />
                          Request to Join
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Join {pod.title}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Full Name *</label>
                              <Input
                                value={userInfo.name}
                                onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="John Doe"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Email *</label>
                              <Input
                                type="email"
                                value={userInfo.email}
                                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="john@example.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                              type="tel"
                              value={userInfo.phone}
                              onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="(555) 123-4567"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Message to Pod Leader *</label>
                            <Textarea
                              value={joinMessage}
                              onChange={(e) => setJoinMessage(e.target.value)}
                              placeholder="Hi! I'd love to join your Bay Club pod. I'm interested in..."
                              rows={3}
                            />
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">
                              Your request will be sent to the pod leader. They'll review your information and get back to you.
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsJoinDialogOpen(false)}
                            disabled={joinMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleJoinRequest}
                            disabled={joinMutation.isPending}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {joinMutation.isPending ? "Sending..." : "Send Request"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button disabled>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Pod Full
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}