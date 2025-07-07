import { AccessibilityBadge } from "./accessibility-badge";
import type { Pod } from "@shared/schema";

interface PodCardProps {
  pod: Pod;
  onClick: () => void;
}

export function PodCard({ pod, onClick }: PodCardProps) {
  return (
    <div className="pod-card bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden cursor-pointer" onClick={onClick}>
      <img
        src={pod.imageUrl}
        alt={pod.name}
        className="w-full h-40 object-cover"
      />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-neutral-900">{pod.name}</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            pod.verified 
              ? 'accessibility-badge text-white' 
              : 'bg-neutral-300 text-neutral-700'
          }`}>
            <i className={`fas ${pod.verified ? 'fa-check' : 'fa-clock'} mr-1`}></i>
            {pod.verified ? 'Verified' : 'Pending Review'}
          </div>
        </div>
        <p className="text-sm text-neutral-600 mb-3">{pod.description}</p>
        <div className="flex items-center space-x-4 text-sm text-neutral-500 mb-3">
          <span><i className="fas fa-map-marker-alt mr-1"></i>{pod.distance}</span>
          <span><i className="fas fa-clock mr-1"></i>{pod.availability}</span>
        </div>
        <div className="flex items-center space-x-2 flex-wrap">
          {pod.accessibilityFeatures?.mobility && (
            <AccessibilityBadge type="mobility" />
          )}
          {pod.accessibilityFeatures?.visual && (
            <AccessibilityBadge type="visual" />
          )}
          {pod.accessibilityFeatures?.audio && (
            <AccessibilityBadge type="audio" />
          )}
        </div>
      </div>
    </div>
  );
}
