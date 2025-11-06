import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Lock, 
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      toast({
        title: "Invalid link",
        description: "This password reset link is invalid. Please request a new one.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) {
      toast({
        title: "Invalid link",
        description: "This password reset link is invalid.",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 p-4">
        <Card className="w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border-0">
          <CardContent className="pt-6">
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 ml-2">
                This password reset link is invalid or has expired. Please request a new one.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Link href="/forgot-password">
                <Button 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-request-new-link"
                >
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Create New Password
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {resetSuccess 
                ? "Your password has been reset successfully" 
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {resetSuccess ? (
              <div className="space-y-6">
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
                    Your password has been reset successfully! You can now log in with your new password.
                  </AlertDescription>
                </Alert>

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Redirecting to login page...
                  </p>
                  
                  <Link href="/login">
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      data-testid="button-go-to-login"
                    >
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="pl-10 pr-10"
                      data-testid="input-new-password"
                      {...form.register("newPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      data-testid="button-toggle-new-password"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.newPassword && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="pl-10 pr-10"
                      data-testid="input-confirm-password"
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>

                <div className="text-center">
                  <Link href="/login">
                    <Button 
                      variant="ghost" 
                      type="button"
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                      data-testid="link-back-to-login"
                    >
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
