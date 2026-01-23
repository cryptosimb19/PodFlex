import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Search, 
  User, 
  LogOut,
  Menu,
  X,
  Zap,
  LogIn
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

interface NavigationProps {
  userType?: 'pod_seeker' | 'pod_leader';
}

export default function Navigation({ userType }: NavigationProps) {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if user is authenticated
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
  });
  
  const isAuthenticated = !!currentUser;

  const handleLogout = async () => {
    console.log("🔓 Initiating Logout...");

    // Clear local state first
    localStorage.removeItem('userData');
    localStorage.removeItem('flexpod_user_type');
    localStorage.removeItem('flexpod_onboarding_complete');
    localStorage.removeItem('flexpod_seen_welcome');

    // Clear TanStack Query cache
    queryClient.clear();

    // Clear all service worker caches to prevent stale cached pages
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log("🗑️ Clearing cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
        console.log("✅ All caches cleared");
      } catch (error) {
        console.error("Failed to clear caches:", error);
      }
    }

    // Unregister service worker to ensure fresh state
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log("✅ Service worker unregistered");
        }
      } catch (error) {
        console.error("Failed to unregister service worker:", error);
      }
    }

    // Redirect to logout endpoint
    window.location.href = '/api/auth/logout';
  };

  // Build nav items based on authentication status
  const navItems = [
    // Only show Dashboard for authenticated users
    ...(isAuthenticated ? [{
      label: 'Dashboard',
      path: userType === 'pod_leader' ? '/pod-leader-dashboard' : '/dashboard',
      icon: <Home className="w-4 h-4" />,
      testId: 'nav-dashboard'
    }] : []),
    {
      label: 'Browse Pods',
      path: '/pods',
      icon: <Search className="w-4 h-4" />,
      testId: 'nav-browse-pods'
    }
  ];

  const isActive = (path: string) => location === path;
  
  // Don't allow logo navigation during onboarding flows
  const isOnboardingPage = location === '/user-type-selection' || 
                           location === '/onboarding' || 
                           location === '/pod-leader-registration';
  
  const handleLogoClick = () => {
    // Prevent navigation during onboarding to avoid losing progress
    if (!isOnboardingPage) {
      navigate('/');
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className={`flex items-center space-x-2 ${!isOnboardingPage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
            onClick={handleLogoClick}
            data-testid="nav-logo"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">FlexPod</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-2 ${
                  isActive(item.path) 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                data-testid={item.testId}
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            ))}
            
            {isAuthenticated ? (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-primary"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            data-testid="button-mobile-menu"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-gray-200 dark:border-gray-800">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2 justify-start ${
                  isActive(item.path) 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                data-testid={`${item.testId}-mobile`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Button>
            ))}
            
            {isAuthenticated ? (
              <Button
                variant="ghost"
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 justify-start text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
                data-testid="button-logout-mobile"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/login');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 justify-start text-gray-700 dark:text-gray-300 hover:text-primary"
                data-testid="button-login-mobile"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
