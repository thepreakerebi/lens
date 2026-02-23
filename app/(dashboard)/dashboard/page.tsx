"use client";

import { useMemo } from "react";
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

  // Stable timestamp for "today" / "this week" windows; computed once per mount
  // eslint-disable-next-line react-hooks/purity -- Date.now() used intentionally for dashboard time windows
  const now = useMemo(() => Date.now(), []);

  const unreadCount = recentIncidents?.filter((i) => !i.isRead).length ?? 0;
  const todayIncidents = recentIncidents?.filter(
    (i) => i.detectedAt > now - 86_400_000
  ).length ?? 0;
  const thisWeekSearches = searchHistory?.filter(
    (q) => q._creationTime > now - 7 * 86_400_000
  ).length ?? 0;

  const last5Incidents = recentIncidents?.slice(0, 5);

  return (
    <article className="p-6 flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-base mt-1">
          Real-time overview of your cameras and incidents.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4" aria-label="Statistics">
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
      </section>

      <section aria-labelledby="quick-search-heading">
        <h2 id="quick-search-heading" className="text-base font-semibold mb-3">
          Quick Search
        </h2>
        <SearchBar compact />
      </section>

      <section aria-labelledby="recent-incidents-heading">
        <header className="flex items-center justify-between mb-3">
          <h2 id="recent-incidents-heading" className="text-lg font-semibold">
            Recent Incidents
          </h2>
          {unreadCount > 0 ? (
            <small className="text-sm text-muted-foreground">
              {unreadCount} unread
            </small>
          ) : null}
        </header>
        {last5Incidents === undefined ? (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-20 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : last5Incidents.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No incidents yet. Incidents appear here when alert rules match.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {last5Incidents.map((incident) => (
              <li key={incident._id}>
                <IncidentCard incident={incident} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
