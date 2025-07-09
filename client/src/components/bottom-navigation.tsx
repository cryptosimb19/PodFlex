import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Search, LayoutDashboard, Users, User } from "lucide-react";

interface BottomNavigationProps {
  currentPage: string;
}

export function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [, navigate] = useLocation();

  // Check if user is a pod leader based on localStorage
  const getUserType = () => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        return 'leader'; // Can be enhanced to detect actual user type
      }
    } catch (error) {
      console.error('Failed to load user type:', error);
    }
    return 'seeker';
  };

  const userType = getUserType();

  const navItems = [
    { id: 'pods', label: 'Pods', icon: Search, path: '/pods' },
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: userType === 'leader' ? '/pod-leader-dashboard' : '/dashboard' 
    },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
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
              <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-neutral-400'}`} />
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
