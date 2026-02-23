import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 5 minutes: poll videos stuck in "indexing" state and update their status
crons.interval(
  "poll indexing status",
  { minutes: 5 },
  internal.videos.pollAllPending,
  {}
);

// Every 15 minutes: run alert rules against newly-ready videos, create incidents
crons.interval(
  "run alert checks",
  { minutes: 15 },
  internal.alerts.runAlertCheckForNewVideos,
  {} // no userId = process all users
);

export default crons;
