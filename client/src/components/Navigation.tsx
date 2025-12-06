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
    try {
      console.log("🔓 Logging out...");
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear localStorage first
      localStorage.removeItem('userData');
      localStorage.removeItem('flexpod_user_type');
      localStorage.removeItem('flexpod_onboarding_complete');
      localStorage.removeItem('flexpod_seen_welcome');
      
      // Clear all React Query cache to remove user data
      queryClient.clear();
      
      // Set auth query data to null AFTER clearing (so it persists)
      queryClient.setQueryData(['/api/auth/user'], null);
      
      console.log("📋 Auth set to null, cache cleared");
      console.log("✅ Logout successful, redirecting to Welcome page");
      
      // Use full page reload for logout to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Clear cache and localStorage even on error
      localStorage.removeItem('userData');
      localStorage.removeItem('flexpod_user_type');
      localStorage.removeItem('flexpod_onboarding_complete');
      localStorage.removeItem('flexpod_seen_welcome');
      queryClient.clear();
      queryClient.setQueryData(['/api/auth/user'], null);
      // Use full page reload for logout to ensure clean state
      window.location.href = '/';
    }
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
