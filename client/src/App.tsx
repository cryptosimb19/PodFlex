import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import OnboardingWizard from "@/pages/onboarding";
import UserTypeSelection from "@/pages/user-type-selection";
import PodLeaderRegistration from "@/pages/pod-leader-registration";
import SearchScreen from "@/pages/search";
import PodDetail from "@/pages/pod-detail";
import Dashboard from "@/pages/dashboard";
import PodLeaderDashboard from "@/pages/pod-leader-dashboard";
import { useEffect } from "react";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Clear localStorage only when transitioning from authenticated to unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      localStorage.removeItem('flexpod_seen_welcome');
      localStorage.removeItem('flexpod_user_type');
      localStorage.removeItem('flexpod_onboarding_complete');
    }
  }, [isAuthenticated, isLoading]);

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
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Welcome} />
          <Route path="/signin" component={Welcome} />
        </>
      ) : (
        <>
          <Route path="/" component={() => {
            // Check localStorage for user flow state
            const hasSeenWelcome = localStorage.getItem('flexpod_seen_welcome');
            const userType = localStorage.getItem('flexpod_user_type');
            const hasCompletedOnboarding = localStorage.getItem('flexpod_onboarding_complete');
            
            if (!hasSeenWelcome) {
              return <Welcome />;
            }
            
            if (!userType) {
              return <UserTypeSelection />;
            }
            
            if (!hasCompletedOnboarding) {
              if (userType === 'pod_leader') {
                return <PodLeaderRegistration />;
              } else {
                return <OnboardingWizard />;
              }
            }
            
            // User has completed onboarding, show appropriate dashboard
            if (userType === 'pod_leader') {
              return <PodLeaderDashboard />;
            } else {
              return <Dashboard />;
            }
          }} />
          <Route path="/user-type" component={UserTypeSelection} />
          <Route path="/onboarding" component={OnboardingWizard} />
          <Route path="/pod-leader-registration" component={PodLeaderRegistration} />
          <Route path="/pods" component={SearchScreen} />
          <Route path="/pod/:id" component={PodDetail} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/pod-leader-dashboard" component={PodLeaderDashboard} />
        </>
      )}
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
