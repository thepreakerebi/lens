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

// ── Queries ───────────────────────────────────────────────────────────────────

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

    const data = (await res.json()) as { _id: string };
    const taskId: string = data._id;

    await ctx.runMutation(internal.videos.updateVideoStatus, {
      videoId,
      indexingStatus: "indexing",
      twelveLabsVideoId: taskId,
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

    const data = (await res.json()) as { _id: string };
    const taskId: string = data._id;

    await ctx.runMutation(internal.videos.updateVideoStatus, {
      videoId,
      indexingStatus: "indexing",
      twelveLabsVideoId: taskId,
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
        metadata?: { duration?: number };
        system_metadata?: { duration?: number };
      };
      const status: string = data.status;

      if (status === "ready") {
        const duration =
          data.metadata?.duration ?? data.system_metadata?.duration;
        await ctx.runMutation(internal.videos.updateVideoStatus, {
          videoId: video._id,
          indexingStatus: "ready",
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
