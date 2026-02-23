"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { IncidentCard } from "@/components/alerts/IncidentCard";
import { AlertRuleForm } from "@/components/alerts/AlertRuleForm";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, Delete01Icon, ToggleOffIcon, ToggleOnIcon } from "@hugeicons/core-free-icons";

export default function AlertsPage() {
  const [tab, setTab] = useState<"all" | "unread">("unread");
  const [showRuleForm, setShowRuleForm] = useState(false);

  const incidents = useQuery(api.alerts.listIncidents, {
    unreadOnly: tab === "unread",
  });
  const alertRules = useQuery(api.alerts.listAlertRules);
  const markAllRead = useMutation(api.alerts.markAllAsRead);
  const deleteRule = useMutation(api.alerts.deleteAlertRule);
  const updateRule = useMutation(api.alerts.updateAlertRule);
  const runCheck = useAction(api.alerts.runAlertCheck);
  const cameras = useQuery(api.cameras.list);

  const unreadCount = useQuery(api.alerts.listIncidents, { unreadOnly: true })?.length ?? 0;

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
        <header className="flex items-center justify-between">
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
              onClick={() => runCheck()}
            >
              Run check now
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

      <Separator />

      <section className="flex flex-col gap-4" aria-labelledby="alert-rules-heading">
        <header className="flex items-center justify-between">
          <h2 id="alert-rules-heading" className="text-base font-semibold">Alert Rules</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRuleForm((v) => !v)}
          >
            <HugeiconsIcon icon={AddCircleIcon} size={16} className="mr-2" />
            New Rule
          </Button>
        </header>

        {showRuleForm && (
          <AlertRuleForm
            cameras={cameras ?? []}
            onSuccess={() => setShowRuleForm(false)}
          />
        )}

        {alertRules === undefined ? (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {Array.from({ length: 2 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-16 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : alertRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alert rules yet. Create one to start detecting incidents automatically.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {alertRules.map((rule: Doc<"alertRules">) => (
              <li
                key={rule._id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <section className="flex flex-col gap-0.5">
                  <strong className="text-sm font-medium">{rule.name}</strong>
                  <small className="text-xs text-muted-foreground">
                    {rule.description}
                  </small>
                </section>
                <section className="flex items-center gap-2" aria-label="Rule actions">
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "active" : "paused"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      updateRule({ id: rule._id, isActive: !rule.isActive })
                    }
                  >
                    {rule.isActive ? (
                      <HugeiconsIcon icon={ToggleOnIcon} size={16} />
                    ) : (
                      <HugeiconsIcon icon={ToggleOffIcon} size={16} />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteRule({ id: rule._id })}
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={16} />
                  </Button>
                </section>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
