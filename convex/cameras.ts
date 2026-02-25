import { ConvexError, v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("cameras")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("cameras") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;
    const camera = await ctx.db.get(id);
    if (!camera || camera.userId !== user._id) return null;
    return camera;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    location: v.string(),
  },
  handler: async (ctx, { name, location }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const cameraId = await ctx.db.insert("cameras", {
      userId: user._id,
      name,
      location,
      status: "active",
    });

    // Kick off Twelve Labs index creation asynchronously
    await ctx.scheduler.runAfter(0, internal.cameras.initIndex, { cameraId: cameraId });

    return cameraId;
  },
});

export const remove = mutation({
  args: { id: v.id("cameras") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const camera = await ctx.db.get(id);
    if (!camera || camera.userId !== user._id)
      throw new ConvexError("Camera not found");

    // Cascade: delete associated videos and incidents
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_camera", (q) => q.eq("cameraId", id))
      .collect();
    for (const video of videos) {
      await ctx.db.delete(video._id);
    }

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_camera", (q) => q.eq("cameraId", id))
      .collect();
    for (const incident of incidents) {
      await ctx.db.delete(incident._id);
    }

    await ctx.db.delete(id);
  },
});

// Used internally by videos.ts and alerts.ts
export const getInternal = internalQuery({
  args: { id: v.id("cameras") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const updateIndexId = internalMutation({
  args: {
    cameraId: v.id("cameras"),
    twelveLabsIndexId: v.string(),
  },
  handler: async (ctx, { cameraId, twelveLabsIndexId }) => {
    await ctx.db.patch(cameraId, { twelveLabsIndexId });
  },
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const initIndex = internalAction({
  args: { cameraId: v.id("cameras") },
  handler: async (ctx, { cameraId }) => {
    const apiKey = process.env.TWELVE_LABS_API_KEY!;

    const res = await fetch("https://api.twelvelabs.io/v1.3/indexes", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        index_name: `lens-${cameraId}`,
        models: [
          { model_name: "marengo2.7", model_options: ["visual", "audio"] },
          { model_name: "pegasus1.2", model_options: ["visual", "audio"] },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Failed to create Twelve Labs index:", err);
      return;
    }

    const data = await res.json();
    const indexId: string = data._id;

    await ctx.runMutation(internal.cameras.updateIndexId, {
      cameraId,
      twelveLabsIndexId: indexId,
    });
  },
});
