import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Shield, 
  AlertCircle,
  Loader2,
  Mail,
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Verify2FAPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("2fa_userId");
    const storedEmail = sessionStorage.getItem("2fa_email");
    
    if (!storedUserId || !storedEmail) {
      navigate("/login");
      return;
    }
    
    setUserId(storedUserId);
    setEmail(storedEmail);
  }, [navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const fullCode = code.join("");
      if (fullCode.length !== 6) {
        throw new Error("Please enter the complete 6-digit code");
      }
      
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: fullCode }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorMessage = 'Verification failed';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      sessionStorage.removeItem("2fa_userId");
      sessionStorage.removeItem("2fa_email");
      
      toast({
        title: "Verification successful",
        description: "Welcome back!",
      });
      
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      const userData = data.user;
      
      if (userData) {
        if (userData.userType) {
          localStorage.setItem('flexpod_user_type', userData.userType);
        }
        if (userData.hasCompletedOnboarding) {
          localStorage.setItem('flexpod_onboarding_complete', 'true');
        }
        
        if (userData.hasCompletedOnboarding && userData.userType) {
          if (userData.userType === 'pod_leader') {
            navigate('/dashboard-select');
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to resend code';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate();
  };

  const handleResend = () => {
    if (countdown === 0) {
      resendMutation.mutate();
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem("2fa_userId");
    sessionStorage.removeItem("2fa_email");
    navigate("/login");
  };

  const maskedEmail = email ? 
    email.replace(/^(.{2})(.*)(@.*)$/, (_, start, middle, end) => 
      start + middle.replace(/./g, '•') + end
    ) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              FlexPod
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h1>
          <p className="text-gray-600">We sent a verification code to</p>
          <p className="text-gray-900 font-medium">{maskedEmail}</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              Enter verification code
            </CardTitle>
            <CardDescription>
              Enter the 6-digit code we sent to your email. The code expires in 10 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div 
                className="flex justify-center gap-2"
                onPaste={handlePaste}
              >
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold border-2 focus:border-purple-500 focus:ring-purple-500"
                    data-testid={`input-2fa-code-${index}`}
                    disabled={verifyMutation.isPending}
                  />
                ))}
              </div>

              {verifyMutation.isError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {(verifyMutation.error as Error).message}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={verifyMutation.isPending || code.some(d => !d)}
                data-testid="button-verify-2fa"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify and Sign In"
                )}
              </Button>

              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResend}
                  disabled={countdown > 0 || resendMutation.isPending}
                  className="text-purple-600 hover:text-purple-700"
                  data-testid="button-resend-2fa"
                >
                  {resendMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend in {countdown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBackToLogin}
                  className="w-full text-gray-600 hover:text-gray-800"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          For security, this code will expire in 10 minutes.
          <br />
          If you didn't request this code, please ignore this message.
        </p>
      </div>
    </div>
  );
}
