"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { IncidentCard } from "@/components/alerts/IncidentCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

export default function AlertsPage() {
  const [tab, setTab] = useState<"all" | "unread">("unread");
  const [runCheckLoading, setRunCheckLoading] = useState(false);

  const incidents = useQuery(api.alerts.listIncidents, {
    unreadOnly: tab === "unread",
  });
  const markAllRead = useMutation(api.alerts.markAllAsRead);
  const runCheck = useAction(api.alerts.runAlertCheck);

  const unreadCount = useQuery(api.alerts.listIncidents, { unreadOnly: true })?.length ?? 0;

  const handleRunCheck = async () => {
    setRunCheckLoading(true);
    try {
      await runCheck();
    } finally {
      setRunCheckLoading(false);
    }
  };

  return (
    <article className="p-6 flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Incidents detected by your alert rules.
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="incidents-heading">
        <h2 id="incidents-heading" className="sr-only">Incidents</h2>
        <header className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background border-b border-border flex items-center justify-between">
          <nav className="flex rounded-md border overflow-hidden w-fit" aria-label="Filter incidents">
            {(["unread", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm transition-colors flex items-center gap-2 ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "unread" ? "Unread" : "All"}
                {t === "unread" && unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
          <section className="flex gap-2" aria-label="Incident actions">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead()}
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunCheck}
              disabled={runCheckLoading}
            >
              {runCheckLoading ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />
                  Running…
                </>
              ) : (
                "Run check now"
              )}
            </Button>
          </section>
        </header>

        {incidents === undefined ? (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {tab === "unread" ? "No unread incidents." : "No incidents yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {incidents.map((incident: Doc<"incidents">) => (
              <li key={incident._id}>
                <IncidentCard incident={incident} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
