import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .order("desc")
      .collect();

    return todos;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const todo = await ctx.db.insert("todos", {
      title: args.title,
      description: args.description,
      status: "pending",
      priority: args.priority || "medium",
      userId: identity.tokenIdentifier,
      createdAt: Date.now(),
    });

    return todo;
  },
});

export const toggleComplete = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== identity.tokenIdentifier) {
      throw new Error("Todo not found or unauthorized");
    }

    const newStatus = todo.status === "completed" ? "pending" : "completed";
    await ctx.db.patch(args.id, {
      status: newStatus,
      completedAt: newStatus === "completed" ? Date.now() : undefined,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== identity.tokenIdentifier) {
      throw new Error("Todo not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== identity.tokenIdentifier) {
      throw new Error("Todo not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
    });
  },
});