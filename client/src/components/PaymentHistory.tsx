import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface PodPayment {
  id: number;
  podId: number;
  status: string;
  baseAmount: number;
  platformFeeAmount: number;
  totalAmount: number;
  paidAt: string | null;
  createdAt: string;
  pod: {
    id: number;
    title: string;
    clubName: string;
  } | null;
}

export default function PaymentHistory() {
  const { data: payments, isLoading, error } = useQuery<PodPayment[]>({
    queryKey: ["/api/payments/my-history"],
    queryFn: async () => {
      const response = await fetch("/api/payments/my-history", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load payments");
      return response.json();
    },
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading payment history...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load payment history</p>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No payment history yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              data-testid={`payment-item-${payment.id}`}
            >
              <div className="flex-1">
                <p className="font-medium">{payment.pod?.title || "Unknown Pod"}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.pod?.clubName || "Unknown Club"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {payment.paidAt 
                    ? `Paid on ${formatDate(payment.paidAt)}`
                    : `Created on ${formatDate(payment.createdAt)}`
                  }
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-semibold">{formatPrice(payment.totalAmount)}</p>
                {getStatusBadge(payment.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
