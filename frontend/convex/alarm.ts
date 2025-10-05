import { mutation, query } from "./_generated/server"
import { v } from "convex/values";

export const createAlarm = mutation({
    args: { time: v.string(), label: v.optional(v.string()) },
    handler: async (ctx, { time, label }) => {
        const now = Date.now();
        const id = await ctx.db.insert("alarms", {
            time,
            label: label ?? "Alarm",
            enabled: true,
            triggered: false,
            lastTriggered: undefined,
            createdAt: now,
        });
        return { id };
    },
});

export const getAlarms = query({
    handler: async (ctx) => {
        // Return all alarms sorted by time (lexicographic HH:MM works)
        return await ctx.db
            .query("alarms")
            .withIndex("by_time")
            .order("asc")
            .collect();
    },
});

export const listActiveAlarms = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("alarms")
            .filter((q) => q.eq(q.field("enabled"), true))
            .withIndex("by_time")
            .order("asc")
            .collect();
    },
});

export const deleteAlarm = mutation({
    args: { id: v.id("alarms") },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return { success: true };
    },
});

export const editAlarm = mutation({
    args: {
        id: v.id("alarms"),
        time: v.optional(v.string()),
        label: v.optional(v.string()),
        enabled: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, time, label, enabled }) => {
        const patch: any = {};
        if (time !== undefined) patch.time = time;
        if (label !== undefined) patch.label = label;
        if (enabled !== undefined) patch.enabled = enabled;
        if (Object.keys(patch).length === 0) return { success: false, reason: "no_fields" };
        await ctx.db.patch(id, patch);
        return { success: true };
    },
})

export const toggleAlarmEnabled = mutation({
    args: { id: v.id("alarms") },
    handler: async (ctx, { id }) => {
        const alarm = await ctx.db.get(id);
        if (!alarm) return { success: false, reason: "not_found" };
        await ctx.db.patch(id, { enabled: !alarm.enabled });
        return { success: true, enabled: !alarm.enabled };
    },
})

export const markLastTriggered = mutation({
    args: { id: v.id("alarms"), lastTriggered: v.string() },
    handler: async (ctx, { id, lastTriggered }) => {
        await ctx.db.patch(id, { lastTriggered, triggered: false });
        return { success: true };
    },
})

export const patchTriggeredFlag = mutation({
    args: { id: v.id("alarms"), triggered: v.boolean() },
    handler: async (ctx, { id, triggered }) => {
        await ctx.db.patch(id, { triggered });
        return { success: true };
    },
});