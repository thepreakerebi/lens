"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoReplayIcon, Clock01Icon } from "@hugeicons/react";

interface SearchResultCardProps {
  result: Doc<"searchResults">;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const video = useQuery(api.videos.get, { id: result.videoId });

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <VideoReplayIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">
            {video?.title ?? "Loading…"}
          </span>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          Score: {(result.score * 100).toFixed(0)}%
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock01Icon className="h-3.5 w-3.5" />
        <span>
          {formatTime(result.start)} – {formatTime(result.end)}
        </span>
      </div>

      {result.pegasusSummary && (
        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2">
          {result.pegasusSummary}
        </p>
      )}
    </Card>
  );
}
