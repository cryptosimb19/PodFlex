import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, DollarSign, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentBreakdown {
  baseAmount: number;
  platformFeeAmount: number;
  platformFeePercentage: number;
  totalAmount: number;
  currency: string;
}

interface PaymentCardProps {
  podId: number;
  podTitle: string;
  showTitle?: boolean;
}

export default function PaymentCard({ podId, podTitle, showTitle = true }: PaymentCardProps) {
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: breakdown, isLoading: breakdownLoading, error: breakdownError } = useQuery<PaymentBreakdown>({
    queryKey: ["/api/payments/breakdown", podId],
    queryFn: async () => {
      const response = await fetch(`/api/payments/breakdown/${podId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load payment details");
      }
      return response.json();
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments/create-checkout", { podId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        setIsRedirecting(true);
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (breakdownLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading payment details...</p>
        </CardContent>
      </Card>
    );
  }

  if (breakdownError || !breakdown) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {breakdownError instanceof Error ? breakdownError.message : "Payment not available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Monthly Payment
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-6"}>
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Pod Membership Fee</span>
              </div>
              <span className="font-medium">{formatPrice(breakdown.baseAmount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Platform Fee ({breakdown.platformFeePercentage}%)</span>
                <Badge variant="outline" className="text-xs">Service Fee</Badge>
              </div>
              <span className="font-medium">{formatPrice(breakdown.platformFeeAmount)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Monthly Payment</span>
              <span className="text-lg font-bold text-primary">{formatPrice(breakdown.totalAmount)}</span>
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={() => createCheckoutMutation.mutate()}
            disabled={createCheckoutMutation.isPending || isRedirecting}
            data-testid="button-pay-now"
          >
            {createCheckoutMutation.isPending || isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isRedirecting ? "Redirecting to payment..." : "Processing..."}
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Pay {formatPrice(breakdown.totalAmount)} Now
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You will be redirected to our secure payment partner to complete your payment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
