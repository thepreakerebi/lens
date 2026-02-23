"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, VideoReplayIcon } from "@hugeicons/core-free-icons";

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
      <section className="p-6" aria-label="Error">
        <p className="text-muted-foreground text-sm">Camera not found.</p>
      </section>
    );
  }

  return (
    <article className="p-6 flex flex-col gap-6 max-w-5xl">
      <header className="flex items-center gap-3">
        <Link href="/cameras">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
        </Link>
        {camera === undefined ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <section>
            <h1 className="text-2xl font-bold">{camera.name}</h1>
            <p className="text-muted-foreground text-sm">{camera.location}</p>
          </section>
        )}
      </header>

      {camera && (
        <section className="flex items-center gap-3" aria-label="Camera status">
          <Badge variant={camera.status === "active" ? "default" : "secondary"}>
            {camera.status}
          </Badge>
          {camera.twelveLabsIndexId ? (
            <small className="text-xs text-muted-foreground">
              AI search ready
            </small>
          ) : (
            <small className="text-xs text-yellow-600">
              Setting up AI search…
            </small>
          )}
        </section>
      )}

      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Footage</h2>
        <Link href={`/ingest?camera=${id}`}>
          <Button size="sm" variant="outline">
            <HugeiconsIcon icon={VideoReplayIcon} size={16} className="mr-2" />
            Ingest Video
          </Button>
        </Link>
      </header>

      {videos === undefined ? (
        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-16 rounded-lg" />
            </li>
          ))}
        </ul>
      ) : videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {`No footage ingested yet. Click "Ingest Video" to add footage.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-2 list-none p-0 m-0">
          {videos.map((video: Doc<"videos">) => (
            <li
              key={video._id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <section className="flex flex-col gap-0.5">
                <strong className="text-sm font-medium">{video.title}</strong>
                {video.duration !== undefined ? (
                  <small className="text-xs text-muted-foreground">
                    {formatDuration(video.duration)}
                  </small>
                ) : null}
              </section>
              <Badge
                className={
                  STATUS_COLORS[video.indexingStatus as keyof typeof STATUS_COLORS] +
                  " text-xs font-medium border-0"
                }
                variant="outline"
              >
                {video.indexingStatus}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
