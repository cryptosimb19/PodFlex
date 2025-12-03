import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { 
  Zap, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2,
  Phone
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

// Phone login schema
const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

// Form schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check available auth providers
  const { data: providers } = useQuery<{ providers: string[] }>({
    queryKey: ['/api/auth/providers'],
    retry: false,
  });

  const isGoogleAvailable = providers?.providers?.includes('google');
  const isAppleAvailable = providers?.providers?.includes('apple');
  const isPhoneAvailable = providers?.providers?.includes('phone');

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Check if email verification is required
        if (responseData.requiresEmailVerification) {
          sessionStorage.setItem("verification_email", responseData.email);
          throw { requiresEmailVerification: true, email: responseData.email, message: responseData.message };
        }
        throw new Error(responseData.message || 'Login failed');
      }
      
      return responseData;
    },
    onSuccess: async (data) => {
      // Check if 2FA is required
      if (data.requires2FA) {
        // Store the user info in sessionStorage for 2FA page
        sessionStorage.setItem("2fa_userId", data.userId);
        sessionStorage.setItem("2fa_email", data.email);
        
        toast({
          title: "Verification required",
          description: "Please check your email for a verification code.",
        });
        
        navigate('/verify-2fa');
        return;
      }
      
      // Normal login success (shouldn't happen with 2FA enabled, but kept for safety)
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      // Get the user data from the query cache
      const userData = queryClient.getQueryData(['/api/auth/user']) as any;
      
      if (userData) {
        // Sync user data to localStorage
        if (userData.userType) {
          localStorage.setItem('flexpod_user_type', userData.userType);
        }
        if (userData.hasCompletedOnboarding) {
          localStorage.setItem('flexpod_onboarding_complete', 'true');
        }
        
        // Redirect based on onboarding status
        if (userData.hasCompletedOnboarding && userData.userType) {
          // User has completed onboarding, go directly to dashboard
          if (userData.userType === 'pod_leader') {
            navigate('/pod-leader-dashboard');
          } else {
            navigate('/dashboard');
          }
        } else {
          // User hasn't completed onboarding, go to onboarding flow
          navigate('/');
        }
      } else {
        // Fallback to root if user data not available
        navigate('/');
      }
    },
    onError: (error: any) => {
      // Check if this is an email verification required error
      if (error.requiresEmailVerification) {
        toast({
          title: "Email verification required",
          description: "Please verify your email before logging in.",
          variant: "destructive",
        });
        navigate('/check-email');
        return;
      }
      
      toast({
        title: "Login failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Check if email verification is required
      if (data.requiresVerification) {
        // Save email for the check-email page
        sessionStorage.setItem("verification_email", data.email);
        
        toast({
          title: "Check your email",
          description: "We've sent you a verification link to confirm your email address.",
        });
        
        navigate('/check-email');
        return;
      }
      
      // Fallback for if verification is not required (shouldn't happen normally)
      toast({
        title: "Registration successful",
        description: "Welcome to FlexPod!",
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      navigate('/user-type-selection');
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  // Phone login forms
  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async (data: PhoneFormData) => {
      const response = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send OTP');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      setPhoneNumber(variables.phoneNumber);
      setOtpStep(true);
      toast({
        title: "OTP sent",
        description: "Please check your phone for the verification code",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async (data: OtpFormData) => {
      const response = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          otp: data.otp,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid OTP');
      }
      
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Login successful",
        description: "Welcome to FlexPod!",
      });
      setPhoneModalOpen(false);
      setOtpStep(false);
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      // Get the user data from the query cache
      const userData = queryClient.getQueryData(['/api/auth/user']) as any;
      
      if (userData) {
        // Sync user data to localStorage
        if (userData.userType) {
          localStorage.setItem('flexpod_user_type', userData.userType);
        }
        if (userData.hasCompletedOnboarding) {
          localStorage.setItem('flexpod_onboarding_complete', 'true');
        }
        
        // Redirect based on onboarding status
        if (userData.hasCompletedOnboarding && userData.userType) {
          if (userData.userType === 'pod_leader') {
            navigate('/pod-leader-dashboard');
          } else {
            navigate('/dashboard');
          }
        } else {
          navigate('/user-type-selection');
        }
      } else {
        navigate('/user-type-selection');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendOtp = (data: PhoneFormData) => {
    sendOtpMutation.mutate(data);
  };

  const handleVerifyOtp = (data: OtpFormData) => {
    verifyOtpMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleAppleLogin = () => {
    window.location.href = '/api/auth/apple';
  };

  const handlePhoneLogin = () => {
    setPhoneModalOpen(true);
    setOtpStep(false);
    phoneForm.reset();
    otpForm.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">FlexPod</h1>
          <p className="text-gray-600 dark:text-gray-300">Welcome back to your fitness community</p>
        </div>

        <Card className="w-full shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        {...loginForm.register("email")}
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        data-testid="input-login-email"
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Link href="/forgot-password">
                        <button
                          type="button"
                          className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                          data-testid="link-forgot-password"
                        >
                          Forgot Password?
                        </button>
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        {...loginForm.register("password")}
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        data-testid="input-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                {(isGoogleAvailable || isAppleAvailable || isPhoneAvailable) && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isGoogleAvailable && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleGoogleLogin}
                          className="w-full"
                          data-testid="button-google-login"
                        >
                          <FcGoogle className="mr-2 h-4 w-4" />
                          Sign in with Google
                        </Button>
                      )}

                      {isAppleAvailable && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAppleLogin}
                          className="w-full"
                          data-testid="button-apple-login"
                        >
                          <SiApple className="mr-2 h-4 w-4" />
                          Sign in with Apple
                        </Button>
                      )}

                      {isPhoneAvailable && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handlePhoneLogin}
                          className="w-full"
                          data-testid="button-phone-login"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Sign in with Phone
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...registerForm.register("firstName")}
                          id="firstName"
                          placeholder="First name"
                          className="pl-10"
                          data-testid="input-register-firstname"
                        />
                      </div>
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        {...registerForm.register("lastName")}
                        id="lastName"
                        placeholder="Last name"
                        data-testid="input-register-lastname"
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        {...registerForm.register("email")}
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        data-testid="input-register-email"
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        {...registerForm.register("password")}
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pl-10 pr-10"
                        data-testid="input-register-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        {...registerForm.register("confirmPassword")}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10"
                        data-testid="input-register-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>

                {(isGoogleAvailable || isAppleAvailable || isPhoneAvailable) && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {isGoogleAvailable && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleGoogleLogin}
                          className="w-full"
                          data-testid="button-google-register"
                        >
                          <FcGoogle className="mr-2 h-4 w-4" />
                          Sign up with Google
                        </Button>
                      )}

                      {isAppleAvailable && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAppleLogin}
                          className="w-full"
                          data-testid="button-apple-register"
                        >
                          <SiApple className="mr-2 h-4 w-4" />
                          Sign up with Apple
                        </Button>
                      )}

                      {isPhoneAvailable && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handlePhoneLogin}
                          className="w-full"
                          data-testid="button-phone-register"
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Sign up with Phone
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-800"
            data-testid="button-back-home"
          >
            ← Back to home
          </Button>
        </div>

        {/* Phone Login Modal */}
        <Dialog open={phoneModalOpen} onOpenChange={setPhoneModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {otpStep ? "Verify OTP" : "Sign in with Phone"}
              </DialogTitle>
              <DialogDescription>
                {otpStep 
                  ? `Enter the 6-digit code sent to ${phoneNumber}`
                  : "Enter your phone number to receive a verification code"
                }
              </DialogDescription>
            </DialogHeader>

            {!otpStep ? (
              <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      {...phoneForm.register("phoneNumber")}
                      id="phoneNumber"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="pl-10"
                      data-testid="input-phone-number"
                    />
                  </div>
                  {phoneForm.formState.errors.phoneNumber && (
                    <p className="text-sm text-red-500">
                      {phoneForm.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  disabled={sendOtpMutation.isPending}
                  data-testid="button-send-otp"
                >
                  {sendOtpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send Code"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    {...otpForm.register("otp")}
                    id="otp"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-otp"
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="text-sm text-red-500">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    disabled={verifyOtpMutation.isPending}
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Sign In"
                    )}
                  </Button>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOtpStep(false);
                      otpForm.reset();
                    }}
                    className="w-full"
                    data-testid="button-back-to-phone"
                  >
                    ← Back to phone number
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}