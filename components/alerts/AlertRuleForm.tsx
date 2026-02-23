"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface AlertRuleFormProps {
  cameras: Doc<"cameras">[];
  onSuccess?: () => void;
}

export function AlertRuleForm({ cameras, onSuccess }: AlertRuleFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cameraId, setCameraId] = useState<string>("");
  const [emailNotification, setEmailNotification] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const createRule = useMutation(api.alerts.createAlertRule);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    setLoading(true);
    try {
      await createRule({
        name,
        description,
        cameraId: (cameraId as Id<"cameras">) || undefined,
        emailNotification,
        webhookUrl: webhookUrl || undefined,
      });
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold">New Alert Rule</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
          <Label htmlFor="rule-name">Rule name</Label>
          <p className="text-xs text-muted-foreground">
            A short name for this rule.
          </p>
          <Input
            id="rule-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
          <Label htmlFor="rule-description">
            Description{" "}
            <small className="text-muted-foreground font-normal">
              (natural language)
            </small>
          </Label>
          <p className="text-xs text-muted-foreground">
            Describe what to detect. Lens searches your footage for this.
          </p>
          <Input
            id="rule-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
          <Label htmlFor="rule-camera">Camera</Label>
          <p className="text-xs text-muted-foreground">
            Apply to a specific camera or all cameras.
          </p>
          <select
            id="rule-camera"
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All cameras</option>
            {cameras.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} — {c.location}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="flex items-center gap-2 border-none p-0 m-0">
          <input
            type="checkbox"
            id="email-notif"
            checked={emailNotification}
            onChange={(e) => setEmailNotification(e.target.checked)}
            className="rounded border-input"
          />
          <Label htmlFor="email-notif">Send email notification</Label>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
          <Label htmlFor="webhook">
            Webhook URL{" "}
            <small className="text-muted-foreground font-normal">(optional)</small>
          </Label>
          <p className="text-xs text-muted-foreground">
            Receive alerts at this URL when the rule matches.
          </p>
          <Input
            id="webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
        </fieldset>

        <footer className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name || !description}
          >
            {loading ? "Creating…" : "Create Rule"}
          </Button>
        </footer>
      </form>
    </Card>
  );
}
