"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, VideoReplayIcon } from "@hugeicons/core-free-icons";
import { AnalyzeVideoDialog } from "@/components/search/AnalyzeVideoDialog";
import { VideoPlayer } from "@/components/video/VideoPlayer";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  indexing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function VideoCard({ video }: { video: Doc<"videos"> }) {
  const isPlayable =
    video.indexingStatus === "ready" && !!video.twelveLabsVideoId;

  return (
    <Card className="overflow-hidden flex flex-col">
      <VideoPlayer
        videoId={video._id}
        startTime={0}
      />

      <section className="p-3 flex flex-col gap-2">
        <header className="flex items-start justify-between gap-2">
          <strong className="text-sm font-medium leading-snug">{video.title}</strong>
          <Badge
            className={
              STATUS_COLORS[video.indexingStatus as keyof typeof STATUS_COLORS] +
              " text-xs font-medium border-0 shrink-0"
            }
            variant="outline"
          >
            {video.indexingStatus}
          </Badge>
        </header>

        <div className="flex items-center justify-between gap-2">
          {video.duration !== undefined ? (
            <span className="text-xs text-muted-foreground">
              {formatDuration(video.duration)}
            </span>
          ) : (
            <span />
          )}

          {isPlayable ? (
            <AnalyzeVideoDialog videoId={video._id} videoTitle={video.title} />
          ) : null}
        </div>

        {!isPlayable && video.indexingStatus !== "ready" && (
          <p className="text-xs text-muted-foreground italic">
            {video.indexingStatus === "pending"
              ? "Waiting to index…"
              : video.indexingStatus === "indexing"
              ? "Indexing in progress…"
              : "Indexing failed."}
          </p>
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

  if (camera === null) {
    return (
      <section className="p-6" aria-label="Error">
        <p className="text-muted-foreground text-sm">Camera not found.</p>
      </section>
    );
  }

  return (
    <article className="p-6 flex flex-col gap-6 max-w-6xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/cameras">Cameras</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {camera === undefined ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <BreadcrumbPage>{camera.name}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
          <Button size="sm" variant="outline">
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
