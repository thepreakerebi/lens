import { ConvexError, v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
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

export const deleteQuery = mutation({
  args: { queryId: v.id("searchQueries") },
  handler: async (ctx, { queryId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const searchQuery = await ctx.db.get(queryId);
    if (!searchQuery || searchQuery.userId !== user._id)
      throw new ConvexError("Search query not found");

    const results = await ctx.db
      .query("searchResults")
      .withIndex("by_query", (q) => q.eq("queryId", queryId))
      .collect();
    for (const r of results) {
      await ctx.db.delete(r._id);
    }
    await ctx.db.delete(queryId);
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
      if (!camera) throw new ConvexError("Camera not found");
      if (camera.userId !== user._id)
        throw new ConvexError("Not authorized to search this camera");
      if (camera.twelveLabsIndexId) indexIds = [camera.twelveLabsIndexId];
    } else {
      const cameras = await ctx.runQuery(
        internal.search.getUserCamerasInternal,
        { userId: user._id }
      );
      indexIds = cameras
        .map((c: Doc<"cameras">) => c.twelveLabsIndexId)
        .filter((id: string | undefined): id is string => !!id);
    }

    // Fallback: fetch all indexes on the account from Twelve Labs directly
    if (indexIds.length === 0) {
      const idxRes = await fetch(
        "https://api.twelvelabs.io/v1.3/indexes?page_limit=50",
        { headers: { "x-api-key": apiKey } }
      );
      if (idxRes.ok) {
        const idxData = (await idxRes.json()) as {
          data?: Array<{ _id: string }>;
        };
        indexIds = (idxData.data ?? []).map((i) => i._id);
      }
    }

    if (indexIds.length === 0) {
      throw new ConvexError(
        "No indexes found on your Twelve Labs account. Please ingest footage first."
      );
    }

    type TLClip = {
      video_id: string;
      start: number;
      end: number;
      score?: number;
      confidence?: string;
    };
    const allClips: Array<TLClip & { indexId: string }> = [];

    for (const indexId of indexIds) {
      const form = new FormData();
      form.append("index_id", indexId);
      form.append("query_text", queryText);
      form.append("search_options", "visual");
      form.append("search_options", "audio");
      form.append("threshold", "low");
      form.append("page_limit", "20");

      const res = await fetch("https://api.twelvelabs.io/v1.3/search", {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: form,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`TL search failed for index ${indexId}:`, errText);
        continue;
      }
      const data = await res.json();
      const clips: TLClip[] = data.data ?? [];
      allClips.push(...clips.map((c) => ({ ...c, indexId })));
    }

    // Sort by score descending
    allClips.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topClips = allClips.slice(0, 20);

    // Try to map TL video IDs → Convex video IDs (best-effort, not required)
    const videosByTlId: Record<string, Id<"videos">> = {};
    const tlVideoIds = [...new Set(topClips.map((c) => c.video_id))];
    for (const tlId of tlVideoIds) {
      const video = await ctx.runQuery(internal.search.getVideoByTlId, { tlId });
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

      // Optionally fetch Pegasus summary for top 3 results
      let pegasusSummary: string | undefined;
      if (i < 3) {
        try {
          const sumRes = await fetch(
            "https://api.twelvelabs.io/v1.3/analyze",
            {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                video_id: clip.video_id,
                prompt: `Describe what's happening between ${clip.start}s and ${clip.end}s in this video clip.`,
                temperature: 0.2,
                stream: false,
              }),
            }
          );
          if (sumRes.ok) {
            const sumData = (await sumRes.json()) as { data?: string };
            pegasusSummary = sumData.data;
          }
        } catch {
          // Summary is optional, don't fail the search
        }
      }

      // Save result regardless of whether a Convex video record exists
      await ctx.runMutation(internal.search.saveResult, {
        queryId: searchQueryId,
        videoId: videosByTlId[clip.video_id],
        twelveLabsVideoId: clip.video_id,
        twelveLabsIndexId: clip.indexId,
        confidence: clip.confidence,
        start: clip.start,
        end: clip.end,
        score: clip.score ?? 0,
        pegasusSummary,
      });
    }

    return searchQueryId;
  },
});

// ── Analyze (Pegasus) ────────────────────────────────────────────────────────

export const analyzeVideo = action({
  args: {
    videoId: v.id("videos"),
    prompt: v.string(),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
  },
  handler: async (ctx, { videoId, prompt, start, end }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const video = await ctx.runQuery(internal.videos.getInternal, { id: videoId });
    if (!video) throw new ConvexError("Video not found");
    if (video.userId !== user._id)
      throw new ConvexError("Not authorized to analyze this video");
    if (!video.twelveLabsVideoId)
      throw new ConvexError("Video is not indexed yet. Please wait for indexing to complete.");
    if (video.indexingStatus !== "ready")
      throw new ConvexError("Video is not ready for analysis yet.");

    const apiKey = process.env.TWELVE_LABS_API_KEY!;
    const effectivePrompt =
      start !== undefined && end !== undefined
        ? `Analyze the video segment from ${start} to ${end} seconds. ${prompt}`
        : prompt;

    const res = await fetch("https://api.twelvelabs.io/v1.3/analyze", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_id: video.twelveLabsVideoId,
        prompt: effectivePrompt,
        temperature: 0.2,
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new ConvexError(`Analysis failed: ${err}`);
    }

    const data = (await res.json()) as { data?: string };
    return data.data ?? "";
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────

export const getUserCamerasInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("cameras")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
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
    videoId: v.optional(v.id("videos")),
    twelveLabsVideoId: v.optional(v.string()),
    twelveLabsIndexId: v.optional(v.string()),
    confidence: v.optional(v.string()),
    start: v.number(),
    end: v.number(),
    score: v.number(),
    pegasusSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("searchResults", args);
  },
});
