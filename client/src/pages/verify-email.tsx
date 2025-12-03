import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
  }, []);

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['/api/auth/verify-email', token],
    queryFn: async () => {
      if (!token) throw new Error('No verification token provided');
      
      const response = await fetch(`/api/auth/verify-email?token=${token}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }
      
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const isSuccess = data?.success;
  const errorMessage = isError ? (error as Error).message : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Verifying your email...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your email address.</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-600">Invalid Link</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                This verification link is missing the required token. Please check your email for the correct link.
              </p>
              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            {isSuccess ? (
              <>
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600" data-testid="text-verification-success">
                  Email Verified!
                </CardTitle>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-600" data-testid="text-verification-failed">
                  Verification Failed
                </CardTitle>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {isSuccess ? (
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Your email has been verified successfully! You can now log in to your account.
                </p>
                
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Welcome to FlexPod! You're all set to start exploring gym membership pods.
                  </AlertDescription>
                </Alert>

                <Link href="/login">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                    data-testid="button-go-to-login"
                  >
                    Continue to Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  {errorMessage || "We couldn't verify your email. The link may have expired or already been used."}
                </p>
                
                <Alert className="bg-amber-50 border-amber-200">
                  <Mail className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    If your link has expired, you can request a new verification email from the login page.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Link href="/login">
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                      data-testid="button-go-to-login"
                    >
                      Go to Login
                    </Button>
                  </Link>
                  
                  <Link href="/check-email">
                    <Button variant="outline" className="w-full">
                      Request New Verification Email
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
