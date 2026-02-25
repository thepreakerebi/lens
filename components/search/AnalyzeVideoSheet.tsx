"use client";

import { useState, useRef, useEffect, isValidElement } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import { MagicWand01Icon } from "@hugeicons/core-free-icons";

interface AnalyzeVideoSheetProps {
  videoId: Id<"videos">;
  videoTitle: string;
  start?: number;
  end?: number;
  trigger?: React.ReactElement;
}

type Message = { role: "user" | "assistant"; content: string };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AnalyzeVideoSheet({
  videoId,
  videoTitle,
  start,
  end,
  trigger,
}: AnalyzeVideoSheetProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLLIElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyzeVideo = useAction(api.search.analyzeVideo);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const userPrompt = prompt.trim();
    setPrompt("");
    setLoading(true);
    setError(null);

    setMessages((prev) => [...prev, { role: "user", content: userPrompt }]);

    try {
      const text = await analyzeVideo({
        videoId,
        prompt: userPrompt,
        start,
        end,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPrompt("");
      setMessages([]);
      setError(null);
    }
  };

  const defaultPlaceholder =
    start !== undefined && end !== undefined
      ? `What is happening in this clip? Describe any notable events, people, or objects.`
      : `Summarize this video. What are the key events, people, and actions?`;

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      trigger
    ) : (
      <Button variant="outline" size="sm">
        <HugeiconsIcon icon={MagicWand01Icon} size={14} className="mr-2" />
        Analyze
      </Button>
    );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={triggerElement} />
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-xl p-0"
        showCloseButton
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-4">
          <SheetTitle>Analyze video</SheetTitle>
          <SheetDescription>
            Use AI to analyze {videoTitle}
            {start !== undefined && end !== undefined
              ? ` (${formatTime(start)} – ${formatTime(end)})`
              : ""}
            . Ask questions or request summaries, reports, or descriptions.
          </SheetDescription>
        </SheetHeader>

        <section
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          aria-label="Conversation"
        >
          <ul className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 list-none m-0">
            {messages.length === 0 ? (
              <li className="text-sm text-muted-foreground py-8 text-center">
                Send a message to start analyzing. Ask questions or request
                summaries, descriptions, or reports.
              </li>
            ) : (
              messages.map((msg, i) => (
                <li
                  key={i}
                  className={
                    msg.role === "user"
                      ? "self-end max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2"
                      : "self-start max-w-[85%] rounded-lg bg-muted px-3 py-2"
                  }
                >
                  <p className="text-sm whitespace-pre-wrap m-0">{msg.content}</p>
                </li>
              ))
            )}
            {loading ? (
              <li className="self-start max-w-[85%] rounded-lg bg-muted px-3 py-2">
                <p className="text-sm text-muted-foreground m-0">Analyzing…</p>
              </li>
            ) : null}
            <li ref={messagesEndRef} aria-hidden />
          </ul>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-border p-4 bg-background"
          >
            {error ? (
              <p className="text-sm text-destructive mb-2">{error}</p>
            ) : null}
            <section className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={defaultPlaceholder}
                rows={2}
                disabled={loading}
                className="min-h-0 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                aria-label="Analysis prompt"
              />
              <Button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="shrink-0 self-end"
              >
                {loading ? "…" : "Send"}
              </Button>
            </section>
          </form>
        </section>
      </SheetContent>
    </Sheet>
  );
}
