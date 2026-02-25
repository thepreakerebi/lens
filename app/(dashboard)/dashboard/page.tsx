"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { IncidentCard } from "@/components/alerts/IncidentCard";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Alert01Icon,
  Search01Icon,
  TransactionHistoryIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

export default function DashboardPage() {
  const [activeQueryId, setActiveQueryId] = useState<Id<"searchQueries"> | null>(null);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recentSearchesOpen, setRecentSearchesOpen] = useState(false);

  const cameras = useQuery(api.cameras.list);
  const hasAnyVideos = useQuery(api.videos.hasAny);
  const recentIncidents = useQuery(api.alerts.listIncidents, { unreadOnly: false });
  const searchHistory = useQuery(api.search.getHistory);
  const syncVideoIds = useAction(api.videos.syncVideoIdsForSearch);
  const userClearedRef = useRef(false);
  const results = useQuery(
    api.search.getResults,
    activeQueryId ? { queryId: activeQueryId } : "skip"
  );

  // Stable timestamp for "today" / "this week" windows; computed once per mount
  const now = useMemo(() => Date.now(), []);

  const unreadCount = recentIncidents?.filter((i) => !i.isRead).length ?? 0;
  const todayIncidents = recentIncidents?.filter(
    (i) => i.detectedAt > now - 86_400_000
  ).length ?? 0;
  const thisWeekSearches = searchHistory?.filter(
    (q) => q._creationTime > now - 7 * 86_400_000
  ).length ?? 0;

  const last5Incidents = recentIncidents?.slice(0, 5);

  const handleSearch = (queryId: Id<"searchQueries">) => {
    setActiveQueryId(queryId);
    setSearching(false);
  };

  // Default to latest search when search history loads (unless user explicitly cleared)
  useEffect(() => {
    if (
      searchHistory &&
      searchHistory.length > 0 &&
      !userClearedRef.current &&
      activeQueryId === null
    ) {
      setActiveQueryId(searchHistory[0]._id);
    }
  }, [searchHistory, activeQueryId]);

  const handleClearResults = () => {
    userClearedRef.current = true;
    setActiveQueryId(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncVideoIds({});
      setActiveQueryId(null);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <article className="p-6 flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-base mt-1">
          Real-time overview of your cameras and incidents.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Statistics">
        {cameras === undefined ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          <>
            <StatsCard
              label="Active Cameras"
              value={cameras.filter((c) => c.status === "active").length}
              icon={Camera01Icon}
            />
            <StatsCard
              label="Incidents Today"
              value={todayIncidents}
              icon={Alert01Icon}
              highlight={todayIncidents > 0}
            />
            <StatsCard
              label="Searches This Week"
              value={thisWeekSearches}
              icon={Search01Icon}
            />
          </>
        )}
      </section>

      <section aria-labelledby="search-footage-heading">
        <header className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background border-b border-border">
          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <section>
              <h2 id="search-footage-heading" className="text-base font-semibold">
                Search Footage
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Describe what you&apos;re looking for in plain English.
              </p>
            </section>
            {activeQueryId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResults}
                className="w-full sm:w-auto shrink-0"
                aria-label="Clear search results and return to default view"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} className="mr-2" />
                Clear results
              </Button>
            ) : null}
          </section>
          <SearchBar
            cameras={cameras ?? []}
            onSearchStart={() => setSearching(true)}
            onSearchComplete={handleSearch}
          />
        </header>
        <section className="flex flex-col sm:flex-row gap-6 mt-4">
          <section className="flex-1 flex flex-col gap-3 min-w-0" aria-label="Search results">
            {searching ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="aspect-video rounded-lg" />
                  </li>
                ))}
              </ul>
            ) : results === undefined && activeQueryId !== null ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="aspect-video rounded-lg" />
                  </li>
                ))}
              </ul>
            ) : results && results.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0 m-0">
                {results.map((result: Doc<"searchResults">) => (
                  <li key={result._id}>
                    <SearchResultCard result={result} />
                  </li>
                ))}
              </ul>
            ) : activeQueryId ? (
              <section className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  No matching clips found. Try a different query.
                </p>
                <p className="text-xs text-muted-foreground">
                  If you recently indexed footage and it appears on Twelve Labs playground, the search index may need syncing.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? "Syncing…" : "Sync indexed videos"}
                </Button>
              </section>
            ) : hasAnyVideos === false ? (
              <section
                className="flex flex-col gap-3 py-8 text-center"
                aria-label="No footage ingested"
              >
                <p className="text-sm text-muted-foreground">
                  No footage ingested yet. Add video to your cameras to enable AI-powered search.
                </p>
                <Link
                  href="/cameras"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "w-fit mx-auto"
                  )}
                >
                  Go to Cameras
                </Link>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter a query above to search your indexed footage.
              </p>
            )}
          </section>

          {/* Recent searches: trigger + sheet on < sm, aside on sm+ */}
          <aside className="hidden sm:block w-56 shrink-0">
            <h3 className="text-sm font-semibold mb-3">Recent Searches</h3>
            {searchHistory === undefined ? (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-8 rounded" />
                  </li>
                ))}
              </ul>
            ) : searchHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No searches yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 list-none p-0 m-0">
                {searchHistory.map((q: Doc<"searchQueries">) => (
                  <button
                    key={q._id}
                    onClick={() => setActiveQueryId(q._id)}
                    className={`text-left px-3 py-2 rounded text-xs transition-colors w-full ${
                      activeQueryId === q._id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <p className="truncate m-0">{q.query}</p>
                    <Badge variant="secondary" className="mt-0.5 text-xs px-1 py-0">
                      {q.resultsCount} results
                    </Badge>
                  </button>
                ))}
              </ul>
            )}
          </aside>

          <Sheet open={recentSearchesOpen} onOpenChange={setRecentSearchesOpen}>
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden w-full"
              onClick={() => setRecentSearchesOpen(true)}
            >
              <HugeiconsIcon icon={TransactionHistoryIcon} size={16} className="mr-2" />
              Recent Searches
            </Button>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Recent Searches</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4 pt-0 overflow-y-auto" aria-label="Recent searches">
                {searchHistory === undefined ? (
                  <ul className="flex flex-col gap-2 list-none p-0 m-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <li key={i}>
                        <Skeleton className="h-8 rounded" />
                      </li>
                    ))}
                  </ul>
                ) : searchHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No searches yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1 list-none p-0 m-0">
                    {searchHistory.map((q: Doc<"searchQueries">) => (
                      <button
                        key={q._id}
                        onClick={() => {
                          setActiveQueryId(q._id);
                          setRecentSearchesOpen(false);
                        }}
                        className={`text-left px-3 py-2 rounded text-xs transition-colors w-full ${
                          activeQueryId === q._id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <p className="truncate m-0">{q.query}</p>
                        <Badge variant="secondary" className="mt-0.5 text-xs px-1 py-0">
                          {q.resultsCount} results
                        </Badge>
                      </button>
                    ))}
                  </ul>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </section>
      </section>

      <section aria-labelledby="recent-incidents-heading">
        <header className="flex items-center justify-between mb-3">
          <h2 id="recent-incidents-heading" className="text-lg font-semibold">
            Recent Incidents
          </h2>
          {unreadCount > 0 ? (
            <small className="text-sm text-muted-foreground">
              {unreadCount} unread
            </small>
          ) : null}
        </header>
        {last5Incidents === undefined ? (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-20 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : last5Incidents.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No incidents yet. Incidents appear here when alert rules match.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {last5Incidents.map((incident) => (
              <li key={incident._id}>
                <IncidentCard incident={incident} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
