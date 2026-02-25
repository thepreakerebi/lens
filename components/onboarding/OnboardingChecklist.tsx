"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  CircleIcon,
  Camera01Icon,
  VideoReplayIcon,
  Search01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";

const CHECKLIST_ITEMS = [
  {
    id: "camera",
    label: "Add a camera",
    href: "/cameras",
    icon: Camera01Icon,
    isDone: (data: { cameras: number }) => data.cameras > 0,
  },
  {
    id: "ingest",
    label: "Ingest a video",
    href: "/ingest",
    icon: VideoReplayIcon,
    isDone: (data: { hasVideos: boolean }) => data.hasVideos,
  },
  {
    id: "search",
    label: "Search footage",
    href: "/dashboard",
    icon: Search01Icon,
    isDone: (data: { hasSearches: boolean }) => data.hasSearches,
  },
  {
    id: "alert",
    label: "Create an alert",
    href: "/settings",
    icon: Alert01Icon,
    isDone: (data: { hasAlertRules: boolean }) => data.hasAlertRules,
  },
] as const;

export function OnboardingChecklist() {
  const [expanded, setExpanded] = useState(true);

  const cameras = useQuery(api.cameras.list);
  const hasVideos = useQuery(api.videos.hasAny);
  const searchHistory = useQuery(api.search.getHistory);
  const alertRules = useQuery(api.alerts.listAlertRules);

  const data = {
    cameras: cameras?.length ?? 0,
    hasVideos: hasVideos ?? false,
    hasSearches: (searchHistory?.length ?? 0) > 0,
    hasAlertRules: (alertRules?.length ?? 0) > 0,
  };

  const allComplete =
    data.cameras > 0 &&
    data.hasVideos &&
    data.hasSearches &&
    data.hasAlertRules;

  if (allComplete) return null;

  const completedCount = CHECKLIST_ITEMS.filter((item) => item.isDone(data)).length;

  return (
    <aside
      className="fixed bottom-6 right-6 z-50 w-72"
      aria-label="Onboarding checklist"
    >
      <Card className="relative overflow-hidden shadow-lg border-0">
        <span
          className="absolute -inset-1 -z-10 rounded-[inherit] opacity-90"
          style={{
            background: `
              linear-gradient(0deg, #6366f1, #a855f7, #ec4899, #22d3ee, #6366f1)
            `,
            backgroundSize: "400% 400%",
            animation: "onboarding-gradient 6s ease-in-out infinite",
          }}
        />
        <span className="absolute inset-1 -z-10 rounded-[inherit] bg-card" />
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">
            Get started
            {!expanded && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({completedCount}/{CHECKLIST_ITEMS.length})
              </span>
            )}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse checklist" : "Expand checklist"}
          >
            <HugeiconsIcon
              icon={expanded ? ArrowDown01Icon : ArrowUp01Icon}
              size={18}
            />
          </Button>
        </header>

        {expanded && (
          <nav className="flex flex-col p-2" aria-label="Checklist items">
            {CHECKLIST_ITEMS.map((item) => {
              const done = item.isDone(data);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-2.5 rounded-md text-sm transition-colors ${
                    done
                      ? "text-muted-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="shrink-0" aria-hidden>
                    {done ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={20}
                        className="text-emerald-600"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={CircleIcon}
                        size={20}
                        className="text-muted-foreground"
                      />
                    )}
                  </span>
                  <HugeiconsIcon icon={Icon} size={16} className="shrink-0 text-muted-foreground" />
                  <span className={done ? "line-through" : undefined}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {expanded && (
          <footer className="px-4 py-2 border-t text-xs text-muted-foreground">
            {completedCount} of {CHECKLIST_ITEMS.length} complete
          </footer>
        )}
      </Card>
    </aside>
  );
}
