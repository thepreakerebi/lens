"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon, Loading03Icon, Alert01Icon } from "@hugeicons/core-free-icons";

interface VideoPlayerProps {
  /** Use when you have a Convex video document */
  videoId?: Id<"videos">;
  /** Use when you only have raw TL IDs (search results without a Convex record) */
  twelveLabsVideoId?: string;
  twelveLabsIndexId?: string;
  /** Seek to this time (seconds) on load */
  startTime?: number;
  endTime?: number;
  className?: string;
}

type StreamData = { videoUrl: string; thumbnailUrl: string | null };

type PlayerState =
  | { type: "idle" }
  | { type: "fetching" }
  | { type: "prefetched"; data: StreamData }
  | { type: "playing"; data: StreamData }
  | { type: "error"; message: string };

export function VideoPlayer({
  videoId,
  twelveLabsVideoId,
  twelveLabsIndexId,
  startTime = 0,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const [state, setState] = useState<PlayerState>({ type: "idle" });

  const getStreamUrl = useAction(api.videos.getStreamUrl);

  const hasIds = videoId || (twelveLabsVideoId && twelveLabsIndexId);

  // Eagerly fetch stream data (including thumbnail) on mount
  useEffect(() => {
    if (!hasIds) return;
    let cancelled = false;

    setState({ type: "fetching" });
    getStreamUrl({ videoId, twelveLabsVideoId, twelveLabsIndexId })
      .then((result) => {
        if (cancelled) return;
        if (!result.videoUrl) {
          setState({ type: "error", message: "No stream available for this video." });
          return;
        }
        setState({
          type: "prefetched",
          data: {
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl,
          },
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load video.";
        setState({ type: "error", message: msg });
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, twelveLabsVideoId, twelveLabsIndexId]);

  const play = useCallback(() => {
    if (state.type === "prefetched") {
      setState({ type: "playing", data: state.data });
    }
  }, [state]);

  // Attach HLS once playing
  useEffect(() => {
    if (state.type !== "playing") return;
    const video = videoRef.current;
    if (!video) return;

    const seekAndPlay = () => {
      if (startTime > 0) video.currentTime = startTime;
      video.play().catch(() => {/* autoplay may be blocked */});
    };

    // Safari native HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = state.data.videoUrl;
      video.addEventListener("loadedmetadata", seekAndPlay, { once: true });
      return () => {
        video.removeEventListener("loadedmetadata", seekAndPlay);
        video.src = "";
      };
    }

    // hls.js for Chrome/Firefox
    let destroyed = false;
    import("hls.js").then(({ default: Hls }) => {
      if (destroyed || !videoRef.current) return;
      if (!Hls.isSupported()) {
        setState({ type: "error", message: "HLS not supported in this browser." });
        return;
      }
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(state.data.videoUrl);
      hls.attachMedia(videoRef.current);
      hls.once(Hls.Events.MANIFEST_PARSED, seekAndPlay);
    });

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [state, startTime]);

  const thumbnailUrl =
    (state.type === "prefetched" || state.type === "playing")
      ? state.data.thumbnailUrl
      : null;

  return (
    <figure className={`relative bg-zinc-900 overflow-hidden aspect-video w-full m-0 ${className}`}>
      {/* Thumbnail background */}
      {state.type !== "playing" && thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Idle / no IDs */}
      {state.type === "idle" && (
        <figcaption className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50">
          <small className="text-xs">No video available</small>
        </figcaption>
      )}

      {/* Fetching stream data */}
      {state.type === "fetching" && (
        <section className="absolute inset-0 flex items-center justify-center" aria-label="Loading video">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={28}
            className="text-white/40 animate-spin"
          />
        </section>
      )}

      {/* Prefetched: show thumbnail + play button */}
      {state.type === "prefetched" && (
        <button
          onClick={play}
          className="absolute inset-0 flex items-center justify-center w-full h-full text-white hover:bg-black/10 transition-colors"
          aria-label="Play video"
        >
          <figure
            aria-hidden
            className="flex items-center justify-center w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/60 m-0"
          >
            <HugeiconsIcon icon={PlayIcon} size={22} className="translate-x-0.5" />
          </figure>
        </button>
      )}

      {/* Error */}
      {state.type === "error" && (
        <section className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4" aria-label="Video error">
          <HugeiconsIcon icon={Alert01Icon} size={24} className="text-red-400" />
          <p className="text-xs text-red-300 text-center">{state.message}</p>
        </section>
      )}

      {/* Playing */}
      {state.type === "playing" && (
        <video
          ref={videoRef}
          controls
          playsInline
          poster={thumbnailUrl ?? undefined}
          className="w-full h-full object-contain"
        />
      )}
    </figure>
  );
}
