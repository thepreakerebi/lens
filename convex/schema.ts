import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cameras: defineTable({
    userId: v.string(), // Better Auth user ID
    name: v.string(),
    location: v.string(),
    twelveLabsIndexId: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
  }).index("by_user", ["userId"]),

  videos: defineTable({
    cameraId: v.id("cameras"),
    userId: v.string(),
    title: v.string(),
    sourceUrl: v.optional(v.string()), // URL-based ingest
    storageId: v.optional(v.id("_storage")), // Direct upload
    twelveLabsVideoId: v.optional(v.string()), // TL video/asset ID in the index
    indexingStatus: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("ready"),
      v.literal("failed")
    ),
    duration: v.optional(v.number()),
    recordedAt: v.optional(v.number()), // Unix ms
  })
    .index("by_camera", ["cameraId"])
    .index("by_user", ["userId"])
    .index("by_status", ["indexingStatus"]),

  searchQueries: defineTable({
    userId: v.string(),
    query: v.string(),
    cameraId: v.optional(v.id("cameras")), // undefined = search all cameras
    resultsCount: v.number(),
  }).index("by_user", ["userId"]),

  searchResults: defineTable({
    queryId: v.id("searchQueries"),
    videoId: v.optional(v.id("videos")),        // may be absent if video not in Convex DB
    twelveLabsVideoId: v.optional(v.string()),   // raw TL video ID for direct lookup
    twelveLabsIndexId: v.optional(v.string()),   // which TL index this came from
    confidence: v.optional(v.string()),          // "high" | "medium" | "low"
    start: v.number(),
    end: v.number(),
    score: v.number(),
    pegasusSummary: v.optional(v.string()),
  }).index("by_query", ["queryId"]),

  alertRules: defineTable({
    userId: v.string(),
    cameraIds: v.optional(v.array(v.id("cameras"))), // undefined/empty = all cameras; non-empty = specific cameras
    cameraId: v.optional(v.id("cameras")), // deprecated: use cameraIds; kept for migration
    name: v.string(),
    description: v.string(), // NL rule, e.g. "person climbing fence"
    emailNotification: v.boolean(),
    webhookUrl: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_user", ["userId"]),

  // Mirrors Better Auth user data for use in internal (non-user-context) actions
  userProfiles: defineTable({
    userId: v.string(), // Better Auth user ID
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  incidents: defineTable({
    userId: v.string(),
    cameraId: v.id("cameras"),
    videoId: v.id("videos"),
    alertRuleId: v.optional(v.id("alertRules")),
    title: v.string(),
    description: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    clipStart: v.number(),
    clipEnd: v.number(),
    isRead: v.boolean(),
    detectedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_camera", ["cameraId"]),
});
