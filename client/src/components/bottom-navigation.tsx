import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Search, LayoutDashboard, User, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BottomNavigationProps {
  currentPage: string;
}

export function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [, navigate] = useLocation();

  const getUserType = () => {
    try {
      const userType = localStorage.getItem('flexpod_user_type');
      if (userType === 'pod_leader') return 'leader';
    } catch (error) {
      console.error('Failed to load user type:', error);
    }
    return 'seeker';
  };

  const userType = getUserType();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/conversations/unread-count'],
    refetchInterval: 15000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const navItems = [
    { id: 'pods', label: 'Pods', icon: Search, path: '/pods', badge: 0 },
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: userType === 'leader' ? '/pod-leader-dashboard' : '/dashboard',
      badge: 0,
    },
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages', badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile', badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center py-2 px-4 touch-target hover:bg-transparent"
            >
              <span className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-neutral-400'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-neutral-400'}`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
