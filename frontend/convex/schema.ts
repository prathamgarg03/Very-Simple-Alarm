import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    alarms: defineTable({
      time: v.string(),
      label: v.string(),
      enabled: v.boolean(),
      triggered: v.optional(v.boolean()),
      lastTriggered: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_time", ["time"]),
  });