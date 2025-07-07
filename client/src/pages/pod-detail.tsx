import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bookmark, Calendar, Navigation, Star, Check } from "lucide-react";
import { AccessibilityBadge } from "@/components/accessibility-badge";
import { usePods } from "@/hooks/use-pods";
import type { Pod } from "@shared/schema";

export default function PodDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getPod } = usePods();
  const [pod, setPod] = useState<Pod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPod = async () => {
      if (id) {
        try {
          const podData = await getPod(parseInt(id));
          setPod(podData);
        } catch (error) {
          console.error("Failed to load pod:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadPod();
  }, [id, getPod]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pod) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">Pod not found</p>
          <Button onClick={() => navigate("/search")}>Back to Search</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm safe-area-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/search")}
              className="w-10 h-10 bg-neutral-100 rounded-full p-0"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </Button>
            <h1 className="text-lg font-semibold text-neutral-900">Pod Details</h1>
            <Button size="sm" variant="outline" className="w-10 h-10 bg-neutral-100 rounded-full p-0">
              <Bookmark className="w-5 h-5 text-neutral-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative">
        <img
          src={pod.imageUrl}
          alt={pod.name}
          className="w-full h-64 object-cover"
        />
        {pod.verified && (
          <div className="absolute top-4 right-4 accessibility-badge text-white px-3 py-1 rounded-full text-sm font-medium">
            <Check className="w-4 h-4 mr-1 inline" />
            Verified Accessible
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Basic Info */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{pod.name}</h1>
          <p className="text-neutral-600 mb-4">{pod.description}</p>
          
          <div className="flex items-center space-x-4 text-sm text-neutral-500 mb-4">
            <span><i className="fas fa-map-marker-alt mr-1"></i>{pod.distance}</span>
            <span><i className="fas fa-clock mr-1"></i>{pod.availability}</span>
            <span><Star className="w-4 h-4 mr-1 inline" />{pod.rating}</span>
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

        {/* Accessibility Features */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            <i className="fas fa-universal-access text-primary mr-2"></i>
            Accessibility Features
          </h2>
          <div className="space-y-3">
            {pod.detailedFeatures?.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-success" />
                </div>
                <div>
                  <span className="font-medium text-neutral-900">{feature.title}</span>
                  <p className="text-sm text-neutral-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-primary text-white py-4 px-6 rounded-xl font-semibold touch-target hover:bg-blue-700 transition-colors">
            <Calendar className="w-5 h-5 mr-2" />
            Book Now
          </Button>
          <Button 
            variant="outline" 
            className="bg-neutral-100 text-neutral-700 py-4 px-6 rounded-xl font-semibold touch-target hover:bg-neutral-200 transition-colors"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Directions
          </Button>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Additional Information</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-neutral-900 mb-1">Operating Hours</h4>
              <p className="text-sm text-neutral-600 whitespace-pre-line">{pod.hours}</p>
            </div>
            {pod.contact && (
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Contact</h4>
                <p className="text-sm text-neutral-600">
                  {pod.contact.phone && `Phone: ${pod.contact.phone}`}
                  {pod.contact.phone && pod.contact.email && <br />}
                  {pod.contact.email && `Email: ${pod.contact.email}`}
                </p>
              </div>
            )}
            {pod.amenities && pod.amenities.length > 0 && (
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Amenities</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pod.amenities.map((amenity, index) => (
                    <span key={index} className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
