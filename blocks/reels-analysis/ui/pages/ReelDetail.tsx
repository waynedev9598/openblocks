import { useEffect, useState } from "react";
import { useParams } from "../../../../ui/src/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "../../../../ui/src/lib/router";
import { useBreadcrumbs } from "../../../../ui/src/context/BreadcrumbContext";
import { reelsAnalysisApi } from "../api";
import { StatusBadge } from "../../../../ui/src/components/StatusBadge";
import { PageSkeleton } from "../../../../ui/src/components/PageSkeleton";
import { EmptyState } from "../../../../ui/src/components/EmptyState";
import { Button } from "../../../../ui/src/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../../ui/src/components/ui/select";
import { ArrowLeft, Film, ExternalLink } from "lucide-react";

const STATUSES = ["saved", "analyzed", "used"];

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ReelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setBreadcrumbs } = useBreadcrumbs();

  const reelQuery = useQuery({
    queryKey: ["reels-analysis", "reels", "detail", id],
    queryFn: () => reelsAnalysisApi.getReel(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      reelsAnalysisApi.updateReel(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reels-analysis", "reels"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => reelsAnalysisApi.deleteReel(id!),
    onSuccess: () => {
      navigate("/reels-analysis/reels");
    },
  });

  const reel = reelQuery.data;

  // Local state for editable fields
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (reel) {
      setNotes(reel.notes ?? "");
      setTagsInput(reel.tags.join(", "));
    }
  }, [reel]);

  useEffect(() => {
    if (reel) {
      setBreadcrumbs([
        { label: "Reels Analysis" },
        { label: "Reels", href: "/reels-analysis/reels" },
        { label: reel.shortcode ?? reel.author ?? "Reel" },
      ]);
    }
  }, [reel, setBreadcrumbs]);

  if (reelQuery.isLoading) return <PageSkeleton variant="detail" />;
  if (!reel) return <EmptyState icon={Film} message="Reel not found." />;

  const saveTags = () => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateMutation.mutate({ tags });
  };

  const saveNotes = () => {
    updateMutation.mutate({ notes: notes || null });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/reels-analysis/reels")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {reel.shortcode ?? reel.author ?? "Reel"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Saved {timeAgo(reel.createdAt)}
          </p>
        </div>
        <StatusBadge status={reel.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content — transcript */}
        <div className="md:col-span-2 space-y-4">
          {/* Transcript */}
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-2">Transcript</h3>
            {reel.transcript ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {reel.transcript}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No speech detected in this reel.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-2">Notes</h3>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="Add your notes about this reel..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
          </div>
        </div>

        {/* Sidebar — properties */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-medium">Properties</h3>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select
                value={reel.status}
                onValueChange={(status) => updateMutation.mutate({ status })}
              >
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <span className="text-sm text-muted-foreground">Tags</span>
              <div className="mt-1">
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  placeholder="comma, separated, tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onBlur={saveTags}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTags();
                  }}
                />
              </div>
            </div>

            {/* URL */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Source</span>
              <a
                href={reel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Instagram
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Shortcode */}
            {reel.shortcode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Shortcode</span>
                <span className="text-sm font-mono">{reel.shortcode}</span>
              </div>
            )}
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => {
              if (window.confirm("Delete this reel?")) {
                deleteMutation.mutate();
              }
            }}
          >
            Delete Reel
          </Button>
        </div>
      </div>
    </div>
  );
}
