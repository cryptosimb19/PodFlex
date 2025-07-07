import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Accessibility } from "lucide-react";
import { PodCard } from "@/components/pod-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { usePods } from "@/hooks/use-pods";
import { useLocation } from "wouter";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { pods, isLoading, searchPods, filterPods } = usePods();
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchPods(query);
    }
  };

  const handleFilterToggle = (filter: string) => {
    let newFilters;
    if (selectedFilters.includes(filter)) {
      newFilters = selectedFilters.filter(f => f !== filter);
    } else {
      newFilters = [...selectedFilters, filter];
    }
    setSelectedFilters(newFilters);
    filterPods(newFilters);
  };

  const handlePodClick = (podId: number) => {
    navigate(`/pod/${podId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-indicator text-white text-center py-2 px-4 text-sm font-medium">
          <i className="fas fa-wifi-slash mr-2"></i>
          You're offline. Some features may be limited.
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm safe-area-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Accessibility className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">FlexAccess</h1>
                <p className="text-sm text-neutral-600">Downtown, Portland</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-10 h-10 bg-neutral-100 rounded-full p-0">
              <User className="w-5 h-5 text-neutral-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-4 bg-white border-b border-neutral-200">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for accessible pods..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-100 rounded-xl border-0 focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-4 bg-white border-b border-neutral-200">
        <div className="flex space-x-2 overflow-x-auto">
          <Button
            size="sm"
            variant={selectedFilters.length === 0 ? "default" : "outline"}
            onClick={() => {
              setSelectedFilters([]);
              filterPods([]);
            }}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium touch-target"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={selectedFilters.includes('mobility') ? "default" : "outline"}
            onClick={() => handleFilterToggle('mobility')}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium touch-target"
          >
            <i className="fas fa-wheelchair mr-2"></i>Mobility
          </Button>
          <Button
            size="sm"
            variant={selectedFilters.includes('visual') ? "default" : "outline"}
            onClick={() => handleFilterToggle('visual')}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium touch-target"
          >
            <i className="fas fa-eye mr-2"></i>Visual
          </Button>
          <Button
            size="sm"
            variant={selectedFilters.includes('audio') ? "default" : "outline"}
            onClick={() => handleFilterToggle('audio')}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium touch-target"
          >
            <i className="fas fa-volume-up mr-2"></i>Audio
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-neutral-600 mt-2">Loading pods...</p>
          </div>
        ) : pods.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">No accessible pods found matching your criteria.</p>
          </div>
        ) : (
          pods.map(pod => (
            <PodCard
              key={pod.id}
              pod={pod}
              onClick={() => handlePodClick(pod.id)}
            />
          ))
        )}
      </div>

      <BottomNavigation currentPage="search" />
    </div>
  );
}
