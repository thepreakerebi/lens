"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import { MagicWand01Icon } from "@hugeicons/core-free-icons";

interface AnalyzeVideoDialogProps {
  videoId: Id<"videos">;
  videoTitle: string;
  start?: number;
  end?: number;
  trigger?: React.ReactNode;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AnalyzeVideoDialog({
  videoId,
  videoTitle,
  start,
  end,
  trigger,
}: AnalyzeVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = useAction(api.search.analyzeVideo);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const text = await analyzeVideo({
        videoId,
        prompt: prompt.trim(),
        start,
        end,
      });
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPrompt("");
      setResult(null);
      setError(null);
    }
  };

  const defaultPrompt =
    start !== undefined && end !== undefined
      ? `What is happening in this clip? Describe any notable events, people, or objects.`
      : `Summarize this video. What are the key events, people, and actions?`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={MagicWand01Icon} size={14} className="mr-2" />
              Analyze
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Analyze video</DialogTitle>
          <DialogDescription>
            Use AI to analyze {videoTitle}
            {start !== undefined && end !== undefined
              ? ` (${formatTime(start)} – ${formatTime(end)})`
              : ""}
            . Ask questions or request summaries, reports, or descriptions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <Label htmlFor="analyze-prompt">Prompt</Label>
            <p className="text-xs text-muted-foreground">
              Describe what you want the AI to analyze or generate.
            </p>
            <Textarea
              id="analyze-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={defaultPrompt}
              rows={3}
              disabled={loading}
            />
          </fieldset>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {result ? (
            <section className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-xs font-semibold mb-2">Analysis</h4>
              <p className="text-sm whitespace-pre-wrap">{result}</p>
            </section>
          ) : null}

          <Button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? "Analyzing…" : "Analyze"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
