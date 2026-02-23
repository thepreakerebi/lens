import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getUserProfile = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const sendIncidentAlert = internalAction({
  args: {
    userId: v.string(),
    cameraName: v.string(),
    cameraLocation: v.string(),
    ruleName: v.string(),
    clipStart: v.number(),
    clipEnd: v.number(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.email.getUserProfile, {
      userId: args.userId,
    });
    if (!profile?.email) return;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const severityLabel =
      args.severity === "high" ? "HIGH" : args.severity === "medium" ? "MEDIUM" : "LOW";

    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, "0");
      const s = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    const severityColor =
      args.severity === "high"
        ? "#dc2626"
        : args.severity === "medium"
          ? "#d97706"
          : "#2563eb";

    await resend.emails.send({
      from: "Lens Alerts <alerts@watchwise.app>",
      to: [profile.email],
      subject: `[${severityLabel}] Incident detected – ${args.cameraName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: ${severityColor}; margin-top: 0;">
            Incident Alert — ${severityLabel} Severity
          </h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 0; color: #6b7280;">Camera</td><td style="padding: 6px 0; font-weight: 600;">${args.cameraName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Location</td><td style="padding: 6px 0;">${args.cameraLocation}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Rule triggered</td><td style="padding: 6px 0;">${args.ruleName}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Clip</td><td style="padding: 6px 0;">${formatTime(args.clipStart)} – ${formatTime(args.clipEnd)}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Detected at</td><td style="padding: 6px 0;">${new Date().toLocaleString()}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">
            This alert was generated automatically by Lens. Log in to your dashboard to review the footage.
          </p>
        </div>
      `,
    });
  },
});
