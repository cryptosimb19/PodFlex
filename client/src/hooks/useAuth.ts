import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check if user has JWT token
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      if (!token) return null;
      
      const response = await fetch("/api/auth/me", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        // Token is invalid, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        throw new Error('Unauthorized');
      }
      
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const finalUser = user || (storedUser ? JSON.parse(storedUser) : null);

  return {
    user: finalUser,
    isLoading: token ? isLoading : false,
    isAuthenticated: !!finalUser && !!token,
  };
}