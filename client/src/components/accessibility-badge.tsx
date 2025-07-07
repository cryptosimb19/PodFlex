import { cn } from "@/lib/utils";

interface AccessibilityBadgeProps {
  type: 'mobility' | 'visual' | 'audio';
  className?: string;
}

export function AccessibilityBadge({ type, className }: AccessibilityBadgeProps) {
  const getIcon = () => {
    switch (type) {
      case 'mobility':
        return <i className="fas fa-wheelchair mr-1"></i>;
      case 'visual':
        return <i className="fas fa-eye mr-1"></i>;
      case 'audio':
        return <i className="fas fa-volume-up mr-1"></i>;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'mobility':
        return 'Mobility';
      case 'visual':
        return 'Visual';
      case 'audio':
        return 'Audio';
      default:
        return '';
    }
  };

  return (
    <span className={cn("accessibility-badge text-white px-3 py-1 rounded-full text-sm inline-flex items-center", className)}>
      {getIcon()}
      {getLabel()}
    </span>
  );
}
