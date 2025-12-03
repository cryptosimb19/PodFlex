import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CheckEmailPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem("verification_email") || "";
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend verification email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent!",
        description: "A new verification email has been sent to your inbox.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Check Your Email
          </h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Verify Your Email Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-purple-600" />
              </div>
              
              <p className="text-gray-600">
                We've sent a verification email to:
              </p>
              
              {email && (
                <p className="font-semibold text-purple-600" data-testid="text-verification-email">
                  {email}
                </p>
              )}
              
              <p className="text-sm text-gray-500">
                Click the link in the email to verify your account and complete registration.
              </p>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800 text-sm">
                The verification link will expire in 24 hours. If you don't see the email, check your spam folder.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending || !email}
                data-testid="button-resend-verification"
              >
                {resendMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Link href="/login">
                <Button variant="ghost" className="w-full" data-testid="link-back-to-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-gray-400">
              Already verified?{" "}
              <Link href="/login" className="text-purple-600 hover:underline">
                Log in here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
