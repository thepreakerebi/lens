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

type StreamState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "ready"; videoUrl: string; thumbnailUrl: string | null }
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
  const [state, setState] = useState<StreamState>({ type: "idle" });

  const getStreamUrl = useAction(api.videos.getStreamUrl);

  const loadAndPlay = useCallback(async () => {
    setState({ type: "loading" });
    try {
      const result = await getStreamUrl({ videoId, twelveLabsVideoId, twelveLabsIndexId });
      if (!result.videoUrl) {
        setState({ type: "error", message: "No stream available for this video." });
        return;
      }
      setState({
        type: "ready",
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load video.";
      setState({ type: "error", message: msg });
    }
  }, [getStreamUrl, videoId, twelveLabsVideoId, twelveLabsIndexId]);

  // Attach HLS once we have the URL
  useEffect(() => {
    if (state.type !== "ready") return;
    const video = videoRef.current;
    if (!video) return;

    const seekAndPlay = () => {
      if (startTime > 0) video.currentTime = startTime;
      video.play().catch(() => {/* autoplay may be blocked */});
    };

    // Safari native HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = state.videoUrl;
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
      hls.loadSource(state.videoUrl);
      hls.attachMedia(videoRef.current);
      hls.once(Hls.Events.MANIFEST_PARSED, seekAndPlay);
    });

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [state, startTime]);

  const hasIds = videoId || (twelveLabsVideoId && twelveLabsIndexId);

  return (
    <div className={`relative bg-black rounded-md overflow-hidden aspect-video w-full ${className}`}>
      {state.type === "idle" && (
        <button
          onClick={loadAndPlay}
          disabled={!hasIds}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 w-full h-full text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Play video"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <HugeiconsIcon icon={PlayIcon} size={24} className="translate-x-0.5" />
          </span>
          <span className="text-xs text-white/70">Click to load &amp; play</span>
        </button>
      )}

      {state.type === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={32}
            className="text-white animate-spin"
          />
        </div>
      )}

      {state.type === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <HugeiconsIcon icon={Alert01Icon} size={24} className="text-red-400" />
          <p className="text-xs text-red-300 text-center">{state.message}</p>
          <button
            onClick={loadAndPlay}
            className="text-xs text-white/60 underline hover:text-white/90"
          >
            Retry
          </button>
        </div>
      )}

      {state.type === "ready" && (
        <video
          ref={videoRef}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}
