import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

// ── Stream URL ────────────────────────────────────────────────────────────────

/** Returns the HLS stream URL for a video. Accepts either a Convex videoId or raw TL IDs. */
export const getStreamUrl = action({
  args: {
    videoId: v.optional(v.id("videos")),
    twelveLabsVideoId: v.optional(v.string()),
    twelveLabsIndexId: v.optional(v.string()),
  },
  handler: async (ctx, { videoId, twelveLabsVideoId, twelveLabsIndexId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    let tlVideoId = twelveLabsVideoId;
    let tlIndexId = twelveLabsIndexId;

    if (videoId) {
      const video = await ctx.runQuery(internal.videos.getInternal, { id: videoId });
      if (!video || video.userId !== user._id)
        throw new ConvexError("Video not found");
      tlVideoId = video.twelveLabsVideoId;
      const camera = await ctx.runQuery(internal.cameras.getInternal, {
        id: video.cameraId,
      });
      tlIndexId = camera?.twelveLabsIndexId;
    }

    if (!tlVideoId || !tlIndexId)
      throw new ConvexError("Video is not indexed yet.");

    const apiKey = process.env.TWELVE_LABS_API_KEY!;
    const res = await fetch(
      `https://api.twelvelabs.io/v1.3/indexes/${tlIndexId}/videos/${tlVideoId}`,
      { headers: { "x-api-key": apiKey } }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError(`Failed to get stream URL: ${err}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // Log for debugging thumbnail availability
    console.log(
      "[getStreamUrl] TL response keys:",
      JSON.stringify({
        hasHls: !!data.hls,
        hlsKeys: data.hls ? Object.keys(data.hls) : [],
        thumbnailUrl: data.hls?.thumbnail_url ?? null,
        thumbnailUrls: data.hls?.thumbnail_urls ?? null,
        topLevelKeys: Object.keys(data),
      })
    );

    // Try all known thumbnail field locations
    const thumbnailUrl: string | null =
      data.hls?.thumbnail_url ??
      data.hls?.thumbnail_urls?.[0] ??
      data.thumbnail_url ??
      data.thumbnail ??
      null;

    return {
      videoUrl: (data.hls?.video_url as string) ?? null,
      thumbnailUrl,
      duration: (data.metadata?.duration as number) ?? null,
      filename: (data.metadata?.filename as string) ?? null,
    };
  },
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const hasAny = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return false;
    const first = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return first !== null;
  },
});

export const listByCamera = query({
  args: { cameraId: v.id("cameras") },
  handler: async (ctx, { cameraId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    const camera = await ctx.db.get(cameraId);
    if (!camera || camera.userId !== user._id) return [];
    return ctx.db
      .query("videos")
      .withIndex("by_camera", (q) => q.eq("cameraId", cameraId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("videos") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;
    const video = await ctx.db.get(id);
    if (!video || video.userId !== user._id) return null;
    return video;
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("videos") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    return ctx.storage.generateUploadUrl();
  },
});

export const createPendingVideo = internalMutation({
  args: {
    cameraId: v.id("cameras"),
    userId: v.string(),
    title: v.string(),
    sourceUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args): Promise<Id<"videos">> => {
    return ctx.db.insert("videos", {
      ...args,
      indexingStatus: "pending",
    });
  },
});

export const updateVideoStatus = internalMutation({
  args: {
    videoId: v.id("videos"),
    indexingStatus: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("ready"),
      v.literal("failed")
    ),
    twelveLabsVideoId: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, { videoId, indexingStatus, twelveLabsVideoId, duration }) => {
    const patch: Record<string, unknown> = { indexingStatus };
    if (twelveLabsVideoId !== undefined) patch.twelveLabsVideoId = twelveLabsVideoId;
    if (duration !== undefined) patch.duration = duration;
    await ctx.db.patch(videoId, patch);
  },
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const ingestByUrl = action({
  args: {
    cameraId: v.id("cameras"),
    title: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, { cameraId, title, sourceUrl }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const camera = await ctx.runQuery(internal.cameras.getInternal, { id: cameraId });
    if (!camera) throw new ConvexError("Camera not found");
    if (camera.userId !== user._id)
      throw new ConvexError("Not authorized to ingest to this camera");
    if (!camera.twelveLabsIndexId)
      throw new ConvexError("Camera index not ready yet. Please wait a moment.");

    // Create the video record
    const videoId: Id<"videos"> = await ctx.runMutation(
      internal.videos.createPendingVideo,
      {
        cameraId,
        userId: user._id,
        title,
        sourceUrl,
      }
    );

    // Submit to Twelve Labs (v1.3 tasks API)
    const apiKey = process.env.TWELVE_LABS_API_KEY!;
    const form = new FormData();
    form.append("index_id", camera.twelveLabsIndexId);
    form.append("video_url", sourceUrl);

    const res = await fetch("https://api.twelvelabs.io/v1.3/tasks", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Twelve Labs ingest failed:", err);
      await ctx.runMutation(internal.videos.updateVideoStatus, {
        videoId,
        indexingStatus: "failed",
      });
      return { videoId, error: "Ingest failed" };
    }

    const data = (await res.json()) as { _id: string; video_id?: string };
    const taskId: string = data._id;
    // Store video_id when available (search uses it); otherwise poll will set it when ready
    const twelveLabsVideoId = data.video_id ?? taskId;

    await ctx.runMutation(internal.videos.updateVideoStatus, {
      videoId,
      indexingStatus: "indexing",
      twelveLabsVideoId,
    });

    return { videoId };
  },
});

export const ingestDirectUpload = action({
  args: {
    cameraId: v.id("cameras"),
    title: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { cameraId, title, storageId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const camera = await ctx.runQuery(internal.cameras.getInternal, { id: cameraId });
    if (!camera) throw new ConvexError("Camera not found");
    if (camera.userId !== user._id)
      throw new ConvexError("Not authorized to ingest to this camera");
    if (!camera.twelveLabsIndexId)
      throw new ConvexError("Camera index not ready yet.");

    const videoId: Id<"videos"> = await ctx.runMutation(
      internal.videos.createPendingVideo,
      {
        cameraId,
        userId: user._id,
        title,
        storageId,
      }
    );

    // Get a download URL for the stored file
    const fileUrl = await ctx.storage.getUrl(storageId);
    if (!fileUrl) {
      await ctx.runMutation(internal.videos.updateVideoStatus, {
        videoId,
        indexingStatus: "failed",
      });
      return { videoId, error: "Failed to get storage URL" };
    }

    const apiKey = process.env.TWELVE_LABS_API_KEY!;
    const form = new FormData();
    form.append("index_id", camera.twelveLabsIndexId);
    form.append("video_url", fileUrl);

    const res = await fetch("https://api.twelvelabs.io/v1.3/tasks", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Twelve Labs ingest failed:", err);
      await ctx.runMutation(internal.videos.updateVideoStatus, {
        videoId,
        indexingStatus: "failed",
      });
      return { videoId, error: "Ingest failed" };
    }

    const data = (await res.json()) as { _id: string; video_id?: string };
    const taskId: string = data._id;
    const twelveLabsVideoId = data.video_id ?? taskId;

    await ctx.runMutation(internal.videos.updateVideoStatus, {
      videoId,
      indexingStatus: "indexing",
      twelveLabsVideoId,
    });

    return { videoId };
  },
});

export const pollAllPending = internalAction({
  args: {},
  handler: async (ctx) => {
    const indexingVideos = await ctx.runQuery(internal.videos.listIndexing);
    for (const video of indexingVideos) {
      if (!video.twelveLabsVideoId) continue;

      const camera = await ctx.runQuery(internal.cameras.getInternal, {
        id: video.cameraId,
      });
      if (!camera?.twelveLabsIndexId) continue;

      const apiKey = process.env.TWELVE_LABS_API_KEY!;
      const res = await fetch(
        `https://api.twelvelabs.io/v1.3/tasks/${video.twelveLabsVideoId}`,
        {
          headers: { "x-api-key": apiKey },
        }
      );

      if (!res.ok) continue;

      const data = (await res.json()) as {
        status: string;
        video_id?: string;
        metadata?: { duration?: number };
        system_metadata?: { duration?: number };
      };
      const status: string = data.status;

      if (status === "ready") {
        const duration =
          data.metadata?.duration ?? data.system_metadata?.duration;
        // Store video_id (not task ID) so search can map results to our videos
        const twelveLabsVideoId = data.video_id ?? video.twelveLabsVideoId;
        await ctx.runMutation(internal.videos.updateVideoStatus, {
          videoId: video._id,
          indexingStatus: "ready",
          twelveLabsVideoId,
          duration,
        });
      } else if (status === "failed") {
        await ctx.runMutation(internal.videos.updateVideoStatus, {
          videoId: video._id,
          indexingStatus: "failed",
        });
      }
    }
  },
});

export const listIndexing = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("videos")
      .withIndex("by_status", (q) => q.eq("indexingStatus", "indexing"))
      .collect();
  },
});

/** Public action: manually trigger sync for ready videos (fixes search mapping). */
export const syncVideoIdsForSearch = action({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    await ctx.runAction(internal.videos.syncReadyVideoIds, {});
  },
});

/** Manually set Twelve Labs video ID (e.g. from playground response). */
export const setVideoTwelveLabsId = mutation({
  args: {
    videoId: v.id("videos"),
    twelveLabsVideoId: v.string(),
  },
  handler: async (ctx, { videoId, twelveLabsVideoId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    const video = await ctx.db.get(videoId);
    if (!video || video.userId !== user._id)
      throw new ConvexError("Video not found or not authorized");
    await ctx.db.patch(videoId, { twelveLabsVideoId });
  },
});

/** Sync twelveLabsVideoId by fetching video IDs from Twelve Labs index. */
export const syncReadyVideoIds = internalAction({
  args: {},
  handler: async (ctx) => {
    const cameras = await ctx.runQuery(internal.videos.listCamerasWithIndex);
    const apiKey = process.env.TWELVE_LABS_API_KEY!;
    for (const camera of cameras) {
      if (!camera.twelveLabsIndexId) continue;
      try {
        const res = await fetch(
          `https://api.twelvelabs.io/v1.3/indexes/${camera.twelveLabsIndexId}/videos?page_limit=50`,
          { headers: { "x-api-key": apiKey } }
        );
        if (!res.ok) continue;
        const data = (await res.json()) as { data?: Array<{ _id: string }> };
        const tlVideoIds = (data.data ?? []).map((v) => v._id);
        if (tlVideoIds.length === 0) continue;

        const ourVideos = await ctx.runQuery(
          internal.videos.listReadyByCamera,
          { cameraId: camera._id }
        );
        // Match by order: newest first (index returns desc by created_at)
        for (let i = 0; i < Math.min(ourVideos.length, tlVideoIds.length); i++) {
          const video = ourVideos[i];
          const tlId = tlVideoIds[i];
          if (video.twelveLabsVideoId !== tlId) {
            await ctx.runMutation(internal.videos.updateVideoStatus, {
              videoId: video._id,
              indexingStatus: "ready",
              twelveLabsVideoId: tlId,
            });
          }
        }
      } catch {
        // Skip on error
      }
    }
  },
});

export const listCamerasWithIndex = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cameras = await ctx.db.query("cameras").collect();
    return cameras.filter((c) => c.twelveLabsIndexId != null);
  },
});

export const listReadyByCamera = internalQuery({
  args: { cameraId: v.id("cameras") },
  handler: async (ctx, { cameraId }) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_camera", (q) => q.eq("cameraId", cameraId))
      .order("desc")
      .take(50);
    return videos.filter((v) => v.indexingStatus === "ready");
  },
});
