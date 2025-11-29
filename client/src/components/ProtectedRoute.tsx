import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Zap } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
  const { user, isLoading, isSuccess } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Wait for the query to complete successfully
    if (isLoading || !isSuccess) return;

    // If no user after successful fetch, redirect to login
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Check onboarding requirement
    if (requireOnboarding) {
      const userData = user as any;
      if (!userData?.hasCompletedOnboarding) {
        navigate('/', { replace: true });
      }
    }
  }, [isLoading, isSuccess, user, navigate, requireOnboarding]);

  // Show loading while fetching
  if (isLoading || !isSuccess) {
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

  // No user after successful fetch = not authenticated
  if (!user) {
    return null;
  }

  // Check onboarding requirement
  if (requireOnboarding) {
    const userData = user as any;
    if (!userData?.hasCompletedOnboarding) {
      return null;
    }
  }

  return <>{children}</>;
}
