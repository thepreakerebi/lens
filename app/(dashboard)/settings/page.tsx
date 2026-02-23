"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { AlertRuleForm } from "@/components/alerts/AlertRuleForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, Delete01Icon } from "@hugeicons/core-free-icons";

export default function SettingsPage() {
  const [showRuleForm, setShowRuleForm] = useState(false);
  const cameras = useQuery(api.cameras.list);
  const alertRules = useQuery(api.alerts.listAlertRules);
  const deleteRule = useMutation(api.alerts.deleteAlertRule);
  const updateRule = useMutation(api.alerts.updateAlertRule);

  return (
    <article className="p-6 flex flex-col gap-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage alert rules and notification preferences.
        </p>
      </header>

      <Card className="p-6 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <section>
            <h2 className="text-base font-semibold">Alert Rules</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Natural-language rules that trigger incident alerts when matched.
            </p>
          </section>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRuleForm((v) => !v)}
          >
            <HugeiconsIcon icon={AddCircleIcon} size={16} className="mr-2" />
            Add Rule
          </Button>
        </header>

        {showRuleForm && (
          <>
            <Separator />
            <AlertRuleForm
              cameras={cameras ?? []}
              onSuccess={() => setShowRuleForm(false)}
            />
          </>
        )}

        <Separator />

        {alertRules === undefined ? (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {Array.from({ length: 2 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-14 rounded" />
              </li>
            ))}
          </ul>
        ) : alertRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alert rules yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {alertRules.map((rule: Doc<"alertRules">) => (
              <li
                key={rule._id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <section className="flex flex-col gap-1 flex-1 min-w-0">
                  <header className="flex items-center gap-2">
                    <strong className="text-sm font-medium">{rule.name}</strong>
                    <Badge
                      variant={rule.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {rule.isActive ? "active" : "paused"}
                    </Badge>
                    {rule.emailNotification && (
                      <Badge variant="outline" className="text-xs">
                        email
                      </Badge>
                    )}
                  </header>
                  <p className="text-xs text-muted-foreground truncate">
                    {rule.description}
                  </p>
                  {rule.webhookUrl && (
                    <p className="text-xs text-muted-foreground truncate">
                      Webhook: {rule.webhookUrl}
                    </p>
                  )}
                </section>
                <section className="flex items-center gap-1 shrink-0" aria-label="Rule actions">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateRule({ id: rule._id, isActive: !rule.isActive })
                    }
                  >
                    {rule.isActive ? "Pause" : "Enable"}
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
      </Card>
    </article>
  );
}
