import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import type { User } from "@shared/schema";

interface PaymentStatus {
  id: number;
  status: string;
  baseAmount: number;
  platformFeeAmount: number;
  totalAmount: number;
  paidAt: string | null;
}

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const checkoutId = searchParams.get("checkout_id");
  const [pollCount, setPollCount] = useState(0);

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", { credentials: "include" });
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
  });

  const { data: paymentStatus, isLoading, error, refetch } = useQuery<PaymentStatus>({
    queryKey: ["/api/payments/status", checkoutId],
    queryFn: async () => {
      const response = await fetch(`/api/payments/status/${checkoutId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch payment status");
      return response.json();
    },
    enabled: !!checkoutId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed" || data.status === "expired") {
        return false;
      }
      return 2000;
    },
  });

  useEffect(() => {
    if (paymentStatus?.status === "pending" && pollCount < 30) {
      const timer = setTimeout(() => {
        setPollCount((c) => c + 1);
        refetch();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, pollCount, refetch]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const userType = currentUser?.userType as "pod_seeker" | "pod_leader" || "pod_seeker";

  if (!checkoutId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation userType={userType} />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Payment</h1>
          <p className="text-muted-foreground mb-6">No checkout ID found.</p>
          <Button onClick={() => navigate("/dashboard")} data-testid="button-go-dashboard">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userType={userType} />
      <div className="max-w-lg mx-auto px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            {isLoading || (paymentStatus?.status === "pending" && pollCount < 30) ? (
              <>
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <CardTitle>Processing Payment</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Please wait while we confirm your payment...
                </p>
              </>
            ) : paymentStatus?.status === "completed" ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <CardTitle>Payment Successful!</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Your membership payment has been processed.
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <CardTitle>Payment {paymentStatus?.status === "expired" ? "Expired" : "Failed"}</CardTitle>
                <p className="text-muted-foreground mt-2">
                  {paymentStatus?.status === "expired"
                    ? "This checkout session has expired. Please try again."
                    : "There was an issue processing your payment. Please try again."}
                </p>
              </>
            )}
          </CardHeader>

          {paymentStatus?.status === "completed" && (
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Membership Fee</span>
                  <span>{formatPrice(paymentStatus.baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span>{formatPrice(paymentStatus.platformFeeAmount)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total Paid</span>
                  <span>{formatPrice(paymentStatus.totalAmount)}</span>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => navigate("/dashboard")}
                data-testid="button-continue-dashboard"
              >
                Continue to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          )}

          {(paymentStatus?.status === "failed" || paymentStatus?.status === "expired") && (
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate("/dashboard")}
                data-testid="button-back-dashboard"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
