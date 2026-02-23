import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";

// ── Queries ───────────────────────────────────────────────────────────────────

export const getHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("searchQueries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
  },
});

export const getResults = query({
  args: { queryId: v.id("searchQueries") },
  handler: async (ctx, { queryId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    const searchQuery = await ctx.db.get(queryId);
    if (!searchQuery || searchQuery.userId !== user._id) return [];
    return ctx.db
      .query("searchResults")
      .withIndex("by_query", (q) => q.eq("queryId", queryId))
      .collect();
  },
});

// ── Actions ───────────────────────────────────────────────────────────────────

export const naturalLanguageSearch = action({
  args: {
    query: v.string(),
    cameraId: v.optional(v.id("cameras")),
  },
  handler: async (ctx, { query: queryText, cameraId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const apiKey = process.env.TWELVE_LABS_API_KEY!;

    // Determine which indexes to search
    let indexIds: string[] = [];
    if (cameraId) {
      const camera = await ctx.runQuery(internal.cameras.getInternal, {
        id: cameraId,
      });
      if (camera?.twelveLabsIndexId) {
        indexIds = [camera.twelveLabsIndexId];
      }
    } else {
      const cameras = await ctx.runQuery(
        internal.search.getUserCamerasInternal,
        { userId: user._id }
      );
      indexIds = cameras
        .map((c: Doc<"cameras">) => c.twelveLabsIndexId)
        .filter((id: string | undefined): id is string => !!id);
    }

    if (indexIds.length === 0) {
      throw new ConvexError(
        "No indexed cameras found. Please add cameras and ingest footage first."
      );
    }

    type TLClip = {
      video_id: string;
      start: number;
      end: number;
      score: number;
    };
    const allClips: Array<TLClip & { indexId: string }> = [];

    for (const indexId of indexIds) {
      const res = await fetch("https://api.twelvelabs.io/v1.3/search", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          index_id: indexId,
          query_text: queryText,
          search_options: ["visual", "conversation", "text_in_video", "logo"],
          threshold: "medium",
          page_limit: 10,
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const clips: TLClip[] = data.data ?? [];
      allClips.push(...clips.map((c) => ({ ...c, indexId })));
    }

    // Sort by score descending and take top 20
    allClips.sort((a, b) => b.score - a.score);
    const topClips = allClips.slice(0, 20);

    // Map TL video IDs → Convex video IDs
    const videosByTlId: Record<string, Id<"videos">> = {};
    const tlVideoIds = [...new Set(topClips.map((c) => c.video_id))];
    for (const tlId of tlVideoIds) {
      const video = await ctx.runQuery(internal.search.getVideoByTlId, {
        tlId,
      });
      if (video) videosByTlId[tlId] = video._id;
    }

    const searchQueryId: Id<"searchQueries"> = await ctx.runMutation(
      internal.search.saveQuery,
      {
        userId: user._id,
        query: queryText,
        cameraId,
        resultsCount: topClips.length,
      }
    );

    for (let i = 0; i < topClips.length; i++) {
      const clip = topClips[i];
      const videoId = videosByTlId[clip.video_id];
      if (!videoId) continue;

      // Optionally fetch Pegasus summary for top 3 results
      let pegasusSummary: string | undefined;
      if (i < 3) {
        try {
          const sumRes = await fetch("https://api.twelvelabs.io/v1.3/generate", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              video_id: clip.video_id,
              type: "summary",
              prompt: `Describe what's happening between ${clip.start}s and ${clip.end}s in this video clip.`,
            }),
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            pegasusSummary = sumData.data ?? sumData.summary;
          }
        } catch {
          // Summary is optional, don't fail the search
        }
      }

      await ctx.runMutation(internal.search.saveResult, {
        queryId: searchQueryId,
        videoId,
        start: clip.start,
        end: clip.end,
        score: clip.score,
        pegasusSummary,
      });
    }

    return searchQueryId;
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────

export const getUserCamerasInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("cameras")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getVideoByTlId = internalQuery({
  args: { tlId: v.string() },
  handler: async (ctx, { tlId }) => {
    return ctx.db
      .query("videos")
      .filter((q) => q.eq(q.field("twelveLabsVideoId"), tlId))
      .first();
  },
});

export const saveQuery = internalMutation({
  args: {
    userId: v.string(),
    query: v.string(),
    cameraId: v.optional(v.id("cameras")),
    resultsCount: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("searchQueries", args);
  },
});

export const saveResult = internalMutation({
  args: {
    queryId: v.id("searchQueries"),
    videoId: v.id("videos"),
    start: v.number(),
    end: v.number(),
    score: v.number(),
    pegasusSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("searchResults", args);
  },
});
