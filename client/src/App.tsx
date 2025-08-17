import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
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
import Login from "@/pages/login";
import Register from "@/pages/register";
import MembershipSelection from "@/pages/membership-selection";
import { useEffect } from "react";

// Landing page for non-authenticated users
function Landing() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Zap className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              FlexPod
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Share high-end gym memberships and make fitness more affordable. 
            Connect with others to split Bay Club membership costs.
          </p>

          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={() => navigate("/user-type")}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-purple-600 bg-white border-2 border-purple-200 rounded-xl hover:bg-purple-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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
          <Route path="/" component={Landing} />
          <Route path="/user-type" component={UserTypeSelection} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/membership-selection" component={MembershipSelection} />
        </>
      ) : (
        <>
          <Route path="/" component={() => {
            // Check localStorage for user flow state
            const userType = localStorage.getItem('flexpod_user_type');
            const hasCompletedOnboarding = localStorage.getItem('flexpod_onboarding_complete');
            
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
          <Route path="/membership-selection" component={MembershipSelection} />
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
