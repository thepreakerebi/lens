import { ConvexError, v } from "convex/values";
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

// ── Incident Queries ──────────────────────────────────────────────────────────

export const listIncidents = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { unreadOnly }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    if (unreadOnly) {
      return ctx.db
        .query("incidents")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", user._id).eq("isRead", false)
        )
        .order("desc")
        .collect();
    }

    return ctx.db
      .query("incidents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const markAsRead = mutation({
  args: { id: v.id("incidents") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    const incident = await ctx.db.get(id);
    if (!incident || incident.userId !== user._id)
      throw new ConvexError("Incident not found");
    await ctx.db.patch(id, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    const unread = await ctx.db
      .query("incidents")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .collect();
    for (const incident of unread) {
      await ctx.db.patch(incident._id, { isRead: true });
    }
  },
});

// ── Alert Rule Queries / Mutations ────────────────────────────────────────────

export const listAlertRules = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    return ctx.db
      .query("alertRules")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const createAlertRule = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    cameraId: v.optional(v.id("cameras")),
    emailNotification: v.boolean(),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    return ctx.db.insert("alertRules", {
      ...args,
      userId: user._id,
      isActive: true,
    });
  },
});

export const updateAlertRule = mutation({
  args: {
    id: v.id("alertRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    emailNotification: v.optional(v.boolean()),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    const rule = await ctx.db.get(id);
    if (!rule || rule.userId !== user._id)
      throw new ConvexError("Alert rule not found");
    // Remove undefined fields from patch
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanPatch);
  },
});

export const deleteAlertRule = mutation({
  args: { id: v.id("alertRules") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    const rule = await ctx.db.get(id);
    if (!rule || rule.userId !== user._id)
      throw new ConvexError("Alert rule not found");
    await ctx.db.delete(id);
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────

export const getActiveRulesForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("alertRules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getReadyVideosSince = internalQuery({
  args: { since: v.number() },
  handler: async (ctx, { since }) => {
    return ctx.db
      .query("videos")
      .withIndex("by_status", (q) => q.eq("indexingStatus", "ready"))
      .filter((q) => q.gte(q.field("_creationTime"), since))
      .collect();
  },
});

export const incidentExistsForClip = internalQuery({
  args: {
    videoId: v.id("videos"),
    clipStart: v.number(),
    alertRuleId: v.id("alertRules"),
  },
  handler: async (ctx, { videoId, clipStart, alertRuleId }) => {
    const existing = await ctx.db
      .query("incidents")
      .filter((q) =>
        q.and(
          q.eq(q.field("videoId"), videoId),
          q.eq(q.field("clipStart"), clipStart),
          q.eq(q.field("alertRuleId"), alertRuleId)
        )
      )
      .first();
    return !!existing;
  },
});

export const createIncident = internalMutation({
  args: {
    userId: v.string(),
    cameraId: v.id("cameras"),
    videoId: v.id("videos"),
    alertRuleId: v.optional(v.id("alertRules")),
    title: v.string(),
    description: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    clipStart: v.number(),
    clipEnd: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("incidents", {
      ...args,
      isRead: false,
      detectedAt: Date.now(),
    });
  },
});

export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all distinct user IDs from cameras
    const cameras = await ctx.db.query("cameras").collect();
    const userIds = [...new Set(cameras.map((c) => c.userId))];
    return userIds;
  },
});

// ── Alert check action (called by cron or on-demand) ───────────────────────────

export const runAlertCheckForNewVideos = internalAction({
  args: {
    /** When set, only process this user's videos. When omitted (cron), process all users. */
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { userId: scopeUserId }) => {
    const since = Date.now() - 20 * 60 * 1000;
    const recentVideos = await ctx.runQuery(
      internal.alerts.getReadyVideosSince,
      { since }
    );

    if (recentVideos.length === 0) return;

    const userIds = scopeUserId
      ? [scopeUserId]
      : await ctx.runQuery(internal.alerts.getAllUsers, {});

    for (const userId of userIds) {
      const rules = await ctx.runQuery(internal.alerts.getActiveRulesForUser, {
        userId,
      });
      if (rules.length === 0) continue;

      const userVideos = recentVideos.filter((v) => v.userId === userId);
      if (userVideos.length === 0) continue;

      for (const rule of rules) {
        const targetVideos = rule.cameraId
          ? userVideos.filter((v) => v.cameraId === rule.cameraId)
          : userVideos;

        for (const video of targetVideos) {
          if (!video.twelveLabsVideoId) continue;

          const camera = await ctx.runQuery(internal.cameras.getInternal, {
            id: video.cameraId,
          });
          if (!camera?.twelveLabsIndexId) continue;

          const apiKey = process.env.TWELVE_LABS_API_KEY!;
          const res = await fetch("https://api.twelvelabs.io/v1.3/search", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              index_id: camera.twelveLabsIndexId,
              query_text: rule.description,
              search_options: ["visual", "conversation"],
              threshold: "high",
              filter: { id: [video.twelveLabsVideoId] },
              page_limit: 5,
            }),
          });

          if (!res.ok) continue;

          const data = await res.json();
          const clips: Array<{
            video_id: string;
            start: number;
            end: number;
            score: number;
          }> = data.data ?? [];

          // Only act on high-confidence matches (score ≥ 0.8)
          const matches = clips.filter((c) => c.score >= 0.8);

          for (const match of matches) {
            // Deduplicate
            const exists = await ctx.runQuery(
              internal.alerts.incidentExistsForClip,
              {
                videoId: video._id,
                clipStart: match.start,
                alertRuleId: rule._id,
              }
            );
            if (exists) continue;

            // Determine severity from score
            const severity =
              match.score >= 0.95 ? "high" : match.score >= 0.85 ? "medium" : "low";

            await ctx.runMutation(internal.alerts.createIncident, {
              userId,
              cameraId: video.cameraId,
              videoId: video._id,
              alertRuleId: rule._id,
              title: `Alert: ${rule.name}`,
              description: `Rule "${rule.description}" matched footage from ${camera.name} at ${match.start.toFixed(0)}s–${match.end.toFixed(0)}s`,
              severity,
              clipStart: match.start,
              clipEnd: match.end,
            });

            // Send email if enabled
            if (rule.emailNotification) {
              await ctx.runAction(internal.email.sendIncidentAlert, {
                userId,
                cameraName: camera.name,
                cameraLocation: camera.location,
                ruleName: rule.name,
                clipStart: match.start,
                clipEnd: match.end,
                severity,
              });
            }

            // Fire webhook if configured
            if (rule.webhookUrl) {
              try {
                await fetch(rule.webhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event: "incident.detected",
                    rule: rule.name,
                    camera: camera.name,
                    location: camera.location,
                    clipStart: match.start,
                    clipEnd: match.end,
                    severity,
                    detectedAt: new Date().toISOString(),
                  }),
                });
              } catch {
                // Webhook failures are non-fatal
              }
            }
          }
        }
      }
    }
  },
});

// ── Public action for running a check on demand ────────────────────────────────

export const runAlertCheck = action({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    await ctx.runAction(internal.alerts.runAlertCheckForNewVideos, {
      userId: user._id,
    });
  },
});
