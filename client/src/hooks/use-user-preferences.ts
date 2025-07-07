import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UserPreferences {
  mobilityAssistance?: boolean;
  visualImpairment?: boolean;
  hearingImpairment?: boolean;
  cognitiveSupport?: boolean;
  location?: string;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(false);

  const savePreferences = async (newPreferences: UserPreferences) => {
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/user/preferences', newPreferences);
      setPreferences(newPreferences);
      
      // Save to localStorage for offline access
      localStorage.setItem('userPreferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = () => {
    try {
      const stored = localStorage.getItem('userPreferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
    return {};
  };

  return {
    preferences,
    savePreferences,
    loadPreferences,
    isLoading,
  };
}
