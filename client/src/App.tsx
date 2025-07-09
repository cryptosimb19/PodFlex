import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/user-type" component={UserTypeSelection} />
      <Route path="/onboarding" component={OnboardingWizard} />
      <Route path="/pod-leader-registration" component={PodLeaderRegistration} />
      <Route path="/pods" component={SearchScreen} />
      <Route path="/pod/:id" component={PodDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pod-leader-dashboard" component={PodLeaderDashboard} />
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
