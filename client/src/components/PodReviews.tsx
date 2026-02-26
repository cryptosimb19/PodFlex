import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Star, Pencil, Trash2, MessageSquarePlus } from "lucide-react";
import type { PodReview } from "@shared/schema";

type ReviewWithAuthor = PodReview & { reviewerName: string | null; reviewerImage: string | null };

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300 dark:text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function AverageRatingBar({ reviews }: { reviews: ReviewWithAuthor[] }) {
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));
  return (
    <div className="flex gap-6 items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <div className="text-center flex-shrink-0">
        <div className="text-4xl font-bold text-gray-900 dark:text-white">{avg.toFixed(1)}</div>
        <StarRating value={Math.round(avg)} readonly />
        <div className="text-xs text-gray-500 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
      </div>
      <div className="flex-1 space-y-1.5">
        {counts.map(({ star, count }) => (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-right text-gray-500">{star}</span>
            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : "0%" }}
              />
            </div>
            <span className="w-4 text-gray-500">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  isOwn,
  onEdit,
  onDelete,
}: {
  review: ReviewWithAuthor;
  isOwn: boolean;
  onEdit: (review: ReviewWithAuthor) => void;
  onDelete: (id: number) => void;
}) {
  const initials = (review.reviewerName ?? "?")
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const dateStr = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="py-4">
      <div className="flex items-start gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          {review.reviewerImage && <AvatarImage src={review.reviewerImage} alt={review.reviewerName ?? ""} />}
          <AvatarFallback className="text-xs bg-gradient-to-br from-purple-400 to-pink-400 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div>
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {review.reviewerName ?? "Member"}
              </span>
              {isOwn && (
                <span className="ml-2 text-xs text-purple-500 font-medium">(you)</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{dateStr}</span>
              {isOwn && (
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(review)}
                    className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                    title="Edit review"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(review.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <StarRating value={review.rating} readonly />
          {review.comment && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PodReviewsProps {
  podId: number;
  currentUserId?: string;
  isMember: boolean;
}

export default function PodReviews({ podId, currentUserId, isMember }: PodReviewsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewWithAuthor | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reviews = [], isLoading } = useQuery<ReviewWithAuthor[]>({
    queryKey: ["/api/pods", podId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/pods/${podId}/reviews`);
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
  });

  const myReview = currentUserId ? reviews.find(r => r.reviewerId === currentUserId) : undefined;
  const canReview = isMember && !!currentUserId && !myReview;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/pods", podId, "reviews"] });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/pods/${podId}/reviews`, { rating, comment }),
    onSuccess: () => {
      toast({ title: "Review submitted", description: "Thanks for sharing your experience!" });
      setShowForm(false);
      setRating(0);
      setComment("");
      invalidate();
    },
    onError: (e: any) => {
      toast({ title: "Failed to submit", description: e?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/reviews/${editingReview!.id}`, { rating, comment }),
    onSuccess: () => {
      toast({ title: "Review updated" });
      setEditingReview(null);
      setRating(0);
      setComment("");
      invalidate();
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: number) => apiRequest("DELETE", `/api/reviews/${reviewId}`),
    onSuccess: () => {
      toast({ title: "Review deleted" });
      invalidate();
    },
    onError: () => {
      toast({ title: "Failed to delete review", variant: "destructive" });
    },
  });

  const handleEdit = (review: ReviewWithAuthor) => {
    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment ?? "");
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingReview(null);
    setRating(0);
    setComment("");
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const activeForm = showForm || editingReview !== null;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Member Reviews</h3>
        {canReview && !activeForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <MessageSquarePlus className="w-4 h-4 mr-1.5" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Aggregate rating */}
      <AverageRatingBar reviews={reviews} />

      {/* Write / edit form */}
      {activeForm && (
        <div className="mt-4 p-4 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
          <h4 className="font-semibold text-sm mb-3 text-purple-800 dark:text-purple-300">
            {editingReview ? "Edit your review" : "Share your experience"}
          </h4>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <Textarea
            placeholder="Tell others about your experience with this pod and leader... (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="text-sm resize-none mb-3"
            maxLength={1000}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={rating === 0 || isSubmitting}
              onClick={() => editingReview ? updateMutation.mutate() : createMutation.mutate()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isSubmitting ? "Saving..." : editingReview ? "Update Review" : "Submit Review"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelForm} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center">
          <Star className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>
          {canReview && !activeForm && (
            <p className="text-xs text-gray-400 mt-1">Be the first to share your experience!</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700 mt-2">
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwn={review.reviewerId === currentUserId}
              onEdit={handleEdit}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
