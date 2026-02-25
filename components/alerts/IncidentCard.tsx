"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon, Clock01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { VideoPlayer } from "@/components/video/VideoPlayer";

interface IncidentCardProps {
  incident: Doc<"incidents">;
  compact?: boolean;
}

const SEVERITY_STYLES = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function IncidentCard({ incident, compact }: IncidentCardProps) {
  const markAsRead = useMutation(api.alerts.markAsRead);
  const camera = useQuery(api.cameras.get, { id: incident.cameraId });

  return (
    <Card
      className={`p-4 flex flex-row gap-4 transition-opacity ${
        incident.isRead ? "opacity-60" : ""
      }`}
    >
      {!compact && (
        <figure className="w-40 shrink-0 aspect-video rounded overflow-hidden m-0" aria-hidden>
          <VideoPlayer
            videoId={incident.videoId}
            startTime={incident.clipStart}
            className="rounded"
          />
        </figure>
      )}
      <section className="flex-1 min-w-0 flex flex-col gap-3">
        <header className="flex items-start justify-between gap-3">
          <section className="flex flex-col gap-1">
            <p className="flex items-center gap-2 m-0">
              <Badge
                className={
                  SEVERITY_STYLES[incident.severity] +
                  " text-xs font-medium border"
                }
                variant="outline"
              >
                {incident.severity.toUpperCase()}
              </Badge>
              <strong className="text-sm font-medium">{incident.title}</strong>
            </p>
            {!compact && (
              <p className="text-xs text-muted-foreground m-0">
                {incident.description}
              </p>
            )}
          </section>
          {!incident.isRead && !compact && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => markAsRead({ id: incident._id })}
              title="Mark as read"
            >
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
            </Button>
          )}
        </header>

        <p className="flex items-center gap-4 text-xs text-muted-foreground m-0 flex-wrap">
          {camera ? (
            <small className="flex items-center gap-1">
              <HugeiconsIcon icon={Camera01Icon} size={14} aria-hidden />
              {camera.name}
            </small>
          ) : null}
          <small className="flex items-center gap-1">
            <HugeiconsIcon icon={Clock01Icon} size={14} aria-hidden />
            {formatTime(incident.clipStart)} – {formatTime(incident.clipEnd)}
          </small>
          <time dateTime={new Date(incident.detectedAt).toISOString()}>
            {new Date(incident.detectedAt).toLocaleString()}
          </time>
        </p>
      </section>
    </Card>
  );
}
