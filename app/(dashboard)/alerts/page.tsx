"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IncidentCard } from "@/components/alerts/IncidentCard";
import { AlertRuleForm } from "@/components/alerts/AlertRuleForm";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AddCircleIcon, Delete01Icon, ToggleOffIcon, ToggleOnIcon } from "@hugeicons/react";

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
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Incidents detected by your alert rules.
        </p>
      </div>

      {/* Incidents */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex rounded-md border overflow-hidden w-fit">
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
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        {incidents === undefined ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {tab === "unread" ? "No unread incidents." : "No incidents yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {incidents.map((incident) => (
              <IncidentCard key={incident._id} incident={incident} />
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Alert Rules */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Alert Rules</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRuleForm((v) => !v)}
          >
            <AddCircleIcon className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>

        {showRuleForm && (
          <AlertRuleForm
            cameras={cameras ?? []}
            onSuccess={() => setShowRuleForm(false)}
          />
        )}

        {alertRules === undefined ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : alertRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alert rules yet. Create one to start detecting incidents automatically.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {alertRules.map((rule) => (
              <div
                key={rule._id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{rule.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {rule.description}
                  </span>
                </div>
                <div className="flex items-center gap-2">
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
                      <ToggleOnIcon className="h-4 w-4" />
                    ) : (
                      <ToggleOffIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteRule({ id: rule._id })}
                  >
                    <Delete01Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
