import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Pod } from "@shared/schema";

export function usePods() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<string[]>([]);

  const { data: pods = [], isLoading, refetch } = useQuery<Pod[]>({
    queryKey: ['/api/pods', searchQuery, filters],
    queryFn: async () => {
      if (searchQuery.trim()) {
        const response = await fetch(`/api/pods/search/${encodeURIComponent(searchQuery)}`);
        return response.json();
      } else if (filters.length > 0) {
        const response = await apiRequest('POST', '/api/pods/filter', { filters });
        return response.json();
      } else {
        const response = await fetch('/api/pods');
        return response.json();
      }
    },
  });

  const searchPods = useCallback(async (query: string) => {
    setSearchQuery(query);
    setFilters([]);
    refetch();
  }, [refetch]);

  const filterPods = useCallback(async (newFilters: string[]) => {
    setFilters(newFilters);
    setSearchQuery("");
    refetch();
  }, [refetch]);

  const getPod = useCallback(async (id: number): Promise<Pod | null> => {
    try {
      const response = await fetch(`/api/pods/${id}`);
      if (!response.ok) {
        throw new Error('Pod not found');
      }
      return response.json();
    } catch (error) {
      console.error('Failed to fetch pod:', error);
      return null;
    }
  }, []);

  return {
    pods,
    isLoading,
    searchPods,
    filterPods,
    getPod,
  };
}
