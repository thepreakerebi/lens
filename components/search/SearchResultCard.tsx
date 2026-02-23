"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";
import { AnalyzeVideoDialog } from "./AnalyzeVideoDialog";
import { VideoPlayer } from "@/components/video/VideoPlayer";

interface SearchResultCardProps {
  result: Doc<"searchResults">;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function confidenceBadgeVariant(c?: string) {
  if (c === "high") return "default" as const;
  if (c === "medium") return "secondary" as const;
  return "outline" as const;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const video = useQuery(
    api.videos.get,
    result.videoId ? { id: result.videoId as Id<"videos"> } : "skip"
  );

  const title =
    video?.title ??
    (result.twelveLabsVideoId
      ? `Clip · ${result.twelveLabsVideoId.slice(0, 8)}…`
      : "Video clip");

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Video player */}
      <VideoPlayer
        videoId={result.videoId as Id<"videos"> | undefined}
        twelveLabsVideoId={result.twelveLabsVideoId}
        twelveLabsIndexId={result.twelveLabsIndexId}
        startTime={result.start}
        endTime={result.end}
      />

      {/* Metadata */}
      <section className="p-3 flex flex-col gap-2">
        <header className="flex items-start justify-between gap-2">
          <strong className="text-sm font-medium leading-snug">{title}</strong>
          <div className="flex items-center gap-1.5 shrink-0">
            {result.confidence && (
              <Badge
                variant={confidenceBadgeVariant(result.confidence)}
                className="text-xs capitalize"
              >
                {result.confidence}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {(result.score * 100).toFixed(0)}%
            </Badge>
            {result.videoId && video ? (
              <AnalyzeVideoDialog
                videoId={result.videoId as Id<"videos">}
                videoTitle={video.title}
                start={result.start}
                end={result.end}
              />
            ) : null}
          </div>
        </header>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground m-0">
          <HugeiconsIcon icon={Clock01Icon} size={13} aria-hidden />
          {formatTime(result.start)} – {formatTime(result.end)}
        </p>

        {result.pegasusSummary && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2 mt-1">
            {result.pegasusSummary}
          </p>
        )}
      </section>
    </Card>
  );
}
