import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, DollarSign, Check, Clock } from "lucide-react";
import type { Pod } from "@shared/schema";

interface PodCardProps {
  pod: Pod;
  onClick: () => void;
}

export function PodCard({ pod, onClick }: PodCardProps) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case "Multi-Club":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Single-Club":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Family":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="pod-card cursor-pointer hover-lift relative overflow-hidden card-transition" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg text-foreground">{pod.clubName}</h3>
              <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                {pod.clubRegion}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pod.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-primary/70" />
                <span>{pod.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-primary/70" />
                <span className="font-medium">{pod.maxMembers - pod.availableSpots}/{pod.maxMembers}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-primary/70" />
                <span className="font-semibold text-foreground">${pod.monthlyFee}/month</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant={pod.availableSpots > 0 ? "default" : "secondary"}
              className={`text-xs font-medium ${
                pod.availableSpots > 0 
                  ? "bg-green-100 text-green-800 border-green-200" 
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {pod.availableSpots > 0 ? (
                <><Check className="w-3 h-3 mr-1" />Available</>
              ) : (
                <><Clock className="w-3 h-3 mr-1" />Full</>
              )}
            </Badge>
            <Badge variant="outline" className={`text-xs font-medium ${getBadgeColor(pod.membershipType)}`}>
              {pod.membershipType}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {pod.amenities.map((amenity, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs bg-primary/10 text-primary/80 border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {amenity}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
