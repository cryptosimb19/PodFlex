import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import LoginPage from "@/pages/login";
import Verify2FAPage from "@/pages/verify-2fa";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OnboardingWizard from "@/pages/onboarding";
import UserTypeSelection from "@/pages/user-type-selection";
import PodLeaderRegistration from "@/pages/pod-leader-registration";
import SearchScreen from "@/pages/search";
import PodDetail from "@/pages/pod-detail";
import Dashboard from "@/pages/dashboard";
import PodLeaderDashboard from "@/pages/pod-leader-dashboard";
import EditProfile from "@/pages/edit-profile";
import CheckEmailPage from "@/pages/check-email";
import VerifyEmailPage from "@/pages/verify-email";
import { useEffect } from "react";

function LoginRedirect() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    const userData = user as any;
    if (userData?.hasCompletedOnboarding && userData?.userType) {
      if (userData.userType === 'pod_leader') {
        navigate('/pod-leader-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  
  return null;
}

function ProtectedDashboard() {
  const { user, isLoading, isSuccess } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Wait for the query to complete successfully
    if (isLoading || !isSuccess) return;
    
    const userData = user as any;
    
    // Only redirect if we have user data but wrong conditions
    if (userData) {
      if (!userData.hasCompletedOnboarding || !userData.userType) {
        // User hasn't completed onboarding, redirect to appropriate flow
        navigate('/', { replace: true });
      } else if (userData.userType === 'pod_leader') {
        // Pod leader accessing pod seeker dashboard, redirect to their dashboard
        navigate('/pod-leader-dashboard', { replace: true });
      }
    }
  }, [user, isLoading, isSuccess, navigate]);
  
  // Show loading state while fetching auth
  if (isLoading || !isSuccess) {
    return null;
  }
  
  const userData = user as any;
  // Render dashboard if user is a pod_seeker with completed onboarding
  if (userData?.hasCompletedOnboarding && userData?.userType === 'pod_seeker') {
    return <Dashboard />;
  }
  
  return null;
}

function ProtectedPodLeaderDashboard() {
  const { user, isLoading, isSuccess } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Wait for the query to complete successfully
    if (isLoading || !isSuccess) return;
    
    const userData = user as any;
    
    // Only redirect if we have user data but wrong conditions
    if (userData) {
      if (!userData.hasCompletedOnboarding || !userData.userType) {
        // User hasn't completed onboarding, redirect to appropriate flow
        navigate('/', { replace: true });
      } else if (userData.userType === 'pod_seeker') {
        // Pod seeker accessing pod leader dashboard, redirect to their dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isLoading, isSuccess, navigate]);
  
  // Show loading state while fetching auth
  if (isLoading || !isSuccess) {
    return null;
  }
  
  const userData = user as any;
  // Render dashboard if user is a pod_leader with completed onboarding
  if (userData?.hasCompletedOnboarding && userData?.userType === 'pod_leader') {
    return <PodLeaderDashboard />;
  }
  
  return null;
}

function RootRouter() {
  const { user, isLoading, isSuccess } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Wait for the query to complete successfully
    if (isLoading || !isSuccess) return;
    
    // Only process redirects if we have user data
    if (!user) return;
    
    const userData = user as any;
    const userType = userData?.userType;
    const hasCompletedOnboarding = userData?.hasCompletedOnboarding;
    
    // For authenticated users, redirect based on onboarding status from database
    if (!userType) {
      navigate('/user-type-selection', { replace: true });
    } else if (!hasCompletedOnboarding) {
      if (userType === 'pod_leader') {
        navigate('/pod-leader-registration', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } else {
      // User has completed onboarding, redirect to appropriate dashboard
      if (userType === 'pod_leader') {
        navigate('/pod-leader-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isLoading, isSuccess, navigate]);
  
  // Show loading indicator during redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-600 dark:text-gray-300">Redirecting...</p>
      </div>
    </div>
  );
}


function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Clear localStorage only when transitioning from authenticated to unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      localStorage.removeItem('userData');
      localStorage.removeItem('flexpod_seen_welcome');
      localStorage.removeItem('flexpod_user_type');
      localStorage.removeItem('flexpod_onboarding_complete');
    }
  }, [isAuthenticated, isLoading]);
  
  // Sync database values to localStorage when user data is available
  useEffect(() => {
    if (user) {
      const userData = user as any;
      if (userData.userType) {
        localStorage.setItem('flexpod_user_type', userData.userType);
      }
      if (userData.hasCompletedOnboarding) {
        localStorage.setItem('flexpod_onboarding_complete', 'true');
      }
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? RootRouter : Welcome} />
      <Route path="/signin" component={Welcome} />
      <Route path="/login" component={isAuthenticated ? LoginRedirect : LoginPage} />
      <Route path="/verify-2fa" component={Verify2FAPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/check-email" component={CheckEmailPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      
      <Route path="/user-type-selection">
        <ProtectedRoute>
          <UserTypeSelection />
        </ProtectedRoute>
      </Route>
      
      <Route path="/onboarding">
        <ProtectedRoute>
          <OnboardingWizard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/pod-leader-registration">
        <ProtectedRoute>
          <PodLeaderRegistration />
        </ProtectedRoute>
      </Route>
      
      <Route path="/pods">
        <ProtectedRoute requireOnboarding>
          <SearchScreen />
        </ProtectedRoute>
      </Route>
      
      <Route path="/pods/:id">
        <ProtectedRoute requireOnboarding>
          <PodDetail />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute requireOnboarding>
          <ProtectedDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/pod-leader-dashboard">
        <ProtectedRoute requireOnboarding>
          <ProtectedPodLeaderDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/edit-profile">
        <ProtectedRoute requireOnboarding>
          <EditProfile />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
