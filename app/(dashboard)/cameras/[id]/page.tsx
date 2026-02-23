"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft01Icon, VideoReplayIcon } from "@hugeicons/react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  indexing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const camera = useQuery(api.cameras.get, {
    id: id as Id<"cameras">,
  });
  const videos = useQuery(api.videos.listByCamera, {
    cameraId: id as Id<"cameras">,
  });

  if (camera === null) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground text-sm">Camera not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/cameras">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft01Icon className="h-4 w-4" />
          </Button>
        </Link>
        {camera === undefined ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <div>
            <h1 className="text-2xl font-bold">{camera.name}</h1>
            <p className="text-muted-foreground text-sm">{camera.location}</p>
          </div>
        )}
      </div>

      {camera && (
        <div className="flex items-center gap-3">
          <Badge variant={camera.status === "active" ? "default" : "secondary"}>
            {camera.status}
          </Badge>
          {camera.twelveLabsIndexId ? (
            <span className="text-xs text-muted-foreground">
              TL Index: {camera.twelveLabsIndexId.slice(0, 12)}…
            </span>
          ) : (
            <span className="text-xs text-yellow-600">
              Creating Twelve Labs index…
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Footage</h2>
        <Link href={`/ingest?camera=${id}`}>
          <Button size="sm" variant="outline">
            <VideoReplayIcon className="h-4 w-4 mr-2" />
            Ingest Video
          </Button>
        </Link>
      </div>

      {videos === undefined ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No footage ingested yet. Click "Ingest Video" to add footage.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {videos.map((video) => (
            <div
              key={video._id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{video.title}</span>
                {video.duration !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </div>
              <Badge
                className={
                  STATUS_COLORS[video.indexingStatus] +
                  " text-xs font-medium border-0"
                }
                variant="outline"
              >
                {video.indexingStatus}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
