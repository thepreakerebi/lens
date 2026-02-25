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
  const [allCameras, setAllCameras] = useState(true);
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<Id<"cameras">>>(
    new Set()
  );
  const [emailNotification, setEmailNotification] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const createRule = useMutation(api.alerts.createAlertRule);

  const handleCameraToggle = (cameraId: Id<"cameras">) => {
    setAllCameras(false);
    setSelectedCameraIds((prev) => {
      const next = new Set(prev);
      if (next.has(cameraId)) {
        next.delete(cameraId);
      } else {
        next.add(cameraId);
      }
      return next;
    });
  };

  const handleAllCamerasChange = (checked: boolean) => {
    setAllCameras(checked);
    if (checked) {
      setSelectedCameraIds(new Set());
    } else {
      setSelectedCameraIds(new Set(cameras.map((c) => c._id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    const cameraIds: Id<"cameras">[] = allCameras
      ? cameras.map((c) => c._id)
      : Array.from(selectedCameraIds);
    if (cameraIds.length === 0) return; // need at least one camera
    setLoading(true);
    try {
      await createRule({
        name,
        description,
        cameraIds,
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

        <fieldset className="flex flex-col gap-2 border-none p-0 m-0">
          <Label>Cameras</Label>
          <p className="text-xs text-muted-foreground">
            Apply to all cameras or select specific ones.
          </p>
          <section className="flex flex-col gap-2 rounded-md border border-input p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allCameras}
                onChange={(e) => handleAllCamerasChange(e.target.checked)}
                className="rounded border-input"
                aria-describedby="rule-camera-all-desc"
              />
              <span id="rule-camera-all-desc">All cameras</span>
            </label>
            {!allCameras && cameras.length > 0 && (
              <ul className="flex flex-col gap-1.5 list-none p-0 m-0 pl-6">
                {cameras.map((c) => (
                  <li key={c._id}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCameraIds.has(c._id)}
                        onChange={() => handleCameraToggle(c._id)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">
                        {c.name} — {c.location}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
            disabled={
              loading ||
              !name ||
              !description ||
              (allCameras ? cameras.length === 0 : selectedCameraIds.size === 0)
            }
          >
            {loading ? "Creating…" : "Create Rule"}
          </Button>
        </footer>
      </form>
    </Card>
  );
}
