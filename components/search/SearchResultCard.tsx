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

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  low: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

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
    <Card className="overflow-hidden flex flex-col group !p-0 !gap-0">
      <VideoPlayer
        videoId={result.videoId as Id<"videos"> | undefined}
        twelveLabsVideoId={result.twelveLabsVideoId}
        twelveLabsIndexId={result.twelveLabsIndexId}
        startTime={result.start}
        endTime={result.end}
      />

      <section className="p-3.5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold leading-snug truncate">{title}</h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HugeiconsIcon icon={Clock01Icon} size={13} className="shrink-0" aria-hidden />
          <span>{formatTime(result.start)} – {formatTime(result.end)}</span>

          {result.confidence && (
            <>
              <span className="text-border">·</span>
              <Badge
                variant="outline"
                className={`text-[11px] capitalize px-1.5 py-0 h-5 font-medium ${CONFIDENCE_STYLES[result.confidence] ?? CONFIDENCE_STYLES.low}`}
              >
                {result.confidence}
              </Badge>
            </>
          )}
        </div>

        {result.pegasusSummary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {result.pegasusSummary}
          </p>
        )}

        {result.videoId && video ? (
          <div className="pt-1 border-t">
            <AnalyzeVideoDialog
              videoId={result.videoId as Id<"videos">}
              videoTitle={video.title}
              start={result.start}
              end={result.end}
            />
          </div>
        ) : null}
      </section>
    </Card>
  );
}
