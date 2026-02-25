"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { VideoReplayIcon } from "@hugeicons/core-free-icons";
import { AnalyzeVideoDialog } from "@/components/search/AnalyzeVideoDialog";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { useBreadcrumbs } from "@/components/providers/BreadcrumbProvider";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  indexing: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
};

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Waiting to index…",
  indexing: "Indexing in progress…",
  failed: "Indexing failed.",
};

function VideoCard({ video }: { video: Doc<"videos"> }) {
  const isPlayable =
    video.indexingStatus === "ready" && !!video.twelveLabsVideoId;

  return (
    <Card className="overflow-hidden flex flex-col group !p-0 !gap-0">
      <VideoPlayer videoId={video._id} startTime={0} />

      <section className="p-3.5 flex flex-col gap-3">
        <h3 className="text-sm font-semibold leading-snug truncate">{video.title}</h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {video.duration !== undefined && (
            <span>{formatDuration(video.duration)}</span>
          )}

          {video.duration !== undefined && (
            <span className="text-border">·</span>
          )}

          <Badge
            variant="outline"
            className={`text-[11px] capitalize px-1.5 py-0 h-5 font-medium ${STATUS_STYLES[video.indexingStatus] ?? ""}`}
          >
            {video.indexingStatus}
          </Badge>
        </div>

        {!isPlayable && STATUS_MESSAGES[video.indexingStatus] && (
          <p className="text-xs text-muted-foreground italic">
            {STATUS_MESSAGES[video.indexingStatus]}
          </p>
        )}

        {isPlayable && (
          <div className="pt-1 border-t">
            <AnalyzeVideoDialog videoId={video._id} videoTitle={video.title} />
          </div>
        )}
      </section>
    </Card>
  );
}

export default function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const camera = useQuery(api.cameras.get, { id: id as Id<"cameras"> });
  const videos = useQuery(api.videos.listByCamera, {
    cameraId: id as Id<"cameras">,
  });
  const { setItems } = useBreadcrumbs();

  useEffect(() => {
    setItems([
      { label: "Cameras", href: "/cameras" },
      { label: camera?.name ?? "…" },
    ]);
    return () => setItems([]);
  }, [camera?.name, setItems]);

  if (camera === null) {
    return (
      <section className="p-6" aria-label="Error">
        <p className="text-muted-foreground text-sm">Camera not found.</p>
      </section>
    );
  }

  return (
    <article className="p-6 flex flex-col gap-6 max-w-6xl">
      <header>
        {camera === undefined ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <>
            <h1 className="text-2xl font-bold">{camera.name}</h1>
            <p className="text-muted-foreground text-sm">{camera.location}</p>
          </>
        )}
      </header>

      {camera && (
        <section className="flex items-center gap-3" aria-label="Camera status">
          <Badge variant={camera.status === "active" ? "default" : "secondary"}>
            {camera.status}
          </Badge>
          {camera.twelveLabsIndexId ? (
            <small className="text-xs text-muted-foreground">
              AI search ready · Index{" "}
              <code className="font-mono">{camera.twelveLabsIndexId.slice(0, 8)}…</code>
            </small>
          ) : (
            <small className="text-xs text-yellow-600">Setting up AI search…</small>
          )}
        </section>
      )}

      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Footage
          {videos !== undefined && (
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({videos.length})
            </span>
          )}
        </h2>
        <Link href={`/ingest?camera=${id}`}>
          <Button size="sm" variant="default">
            <HugeiconsIcon icon={VideoReplayIcon} size={16} className="mr-2" />
            Ingest Video
          </Button>
        </Link>
      </header>

      {videos === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {`No footage ingested yet. Click "Ingest Video" to add footage.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video: Doc<"videos">) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </article>
  );
}
