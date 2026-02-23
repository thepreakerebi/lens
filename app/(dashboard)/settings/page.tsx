"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertRuleForm } from "@/components/alerts/AlertRuleForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddCircleIcon, Delete01Icon } from "@hugeicons/react";

export default function SettingsPage() {
  const [showRuleForm, setShowRuleForm] = useState(false);
  const cameras = useQuery(api.cameras.list);
  const alertRules = useQuery(api.alerts.listAlertRules);
  const deleteRule = useMutation(api.alerts.deleteAlertRule);
  const updateRule = useMutation(api.alerts.updateAlertRule);

  return (
    <div className="p-6 flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage alert rules and notification preferences.
        </p>
      </div>

      {/* Alert Rules */}
      <Card className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Alert Rules</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Natural-language rules that trigger incident alerts when matched.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRuleForm((v) => !v)}
          >
            <AddCircleIcon className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

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
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded" />
            ))}
          </div>
        ) : alertRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alert rules yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {alertRules.map((rule) => (
              <div
                key={rule._id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rule.name}</span>
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
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {rule.description}
                  </p>
                  {rule.webhookUrl && (
                    <p className="text-xs text-muted-foreground truncate">
                      Webhook: {rule.webhookUrl}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
                    <Delete01Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
