"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { IncidentCard } from "@/components/alerts/IncidentCard";
import { SearchBar } from "@/components/search/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera01Icon,
  Alert01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

export default function DashboardPage() {
  const cameras = useQuery(api.cameras.list);
  const recentIncidents = useQuery(api.alerts.listIncidents, { unreadOnly: false });
  const searchHistory = useQuery(api.search.getHistory);

  const unreadCount = recentIncidents?.filter((i) => !i.isRead).length ?? 0;
  const todayIncidents = recentIncidents?.filter(
    (i) => i.detectedAt > Date.now() - 86_400_000
  ).length ?? 0;
  const thisWeekSearches = searchHistory?.filter(
    (q) => q._creationTime > Date.now() - 7 * 86_400_000
  ).length ?? 0;

  const last5Incidents = recentIncidents?.slice(0, 5);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time overview of your cameras and incidents.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {cameras === undefined ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          <>
            <StatsCard
              label="Active Cameras"
              value={cameras.filter((c) => c.status === "active").length}
              icon={Camera01Icon}
            />
            <StatsCard
              label="Incidents Today"
              value={todayIncidents}
              icon={Alert01Icon}
              highlight={todayIncidents > 0}
            />
            <StatsCard
              label="Searches This Week"
              value={thisWeekSearches}
              icon={Search01Icon}
            />
          </>
        )}
      </div>

      {/* Quick search */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Search</h2>
        <SearchBar compact />
      </div>

      {/* Recent incidents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Incidents</h2>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        {last5Incidents === undefined ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : last5Incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No incidents yet. Incidents appear here when alert rules match.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {last5Incidents.map((incident) => (
              <IncidentCard key={incident._id} incident={incident} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
