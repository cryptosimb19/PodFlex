import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, status, isFetched, isSuccess } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always consider data stale to ensure fresh data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // isAuthenticated should only be true when:
  // 1. The query was successful (isSuccess)
  // 2. We actually have user data
  // 3. There's no error
  const isAuthenticated = isSuccess && !!user && !error;

  return {
    user,
    isLoading,
    isFetched,
    isSuccess,
    isAuthenticated,
  };
}