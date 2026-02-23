"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SearchPage() {
  const [activeQueryId, setActiveQueryId] = useState<Id<"searchQueries"> | null>(null);
  const [searching, setSearching] = useState(false);

  const searchHistory = useQuery(api.search.getHistory);
  const results = useQuery(
    api.search.getResults,
    activeQueryId ? { queryId: activeQueryId } : "skip"
  );
  const cameras = useQuery(api.cameras.list);

  const handleSearch = async (queryId: Id<"searchQueries">) => {
    setActiveQueryId(queryId);
    setSearching(false);
  };

  return (
    <article className="p-6 flex flex-col gap-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Search Footage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe what you&apos;re looking for in plain English.
        </p>
      </header>

      <SearchBar
        cameras={cameras ?? []}
        onSearchStart={() => setSearching(true)}
        onSearchComplete={handleSearch}
      />

      <section className="flex gap-6">
        <section className="flex-1 flex flex-col gap-3" aria-label="Search results">
          {searching ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))
          ) : results === undefined && activeQueryId !== null ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))
          ) : results && results.length > 0 ? (
            results.map((result: Doc<"searchResults">) => (
              <SearchResultCard key={result._id} result={result} />
            ))
          ) : activeQueryId ? (
            <p className="text-sm text-muted-foreground">
              No matching clips found. Try a different query.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter a query above to search your indexed footage.
            </p>
          )}
        </section>

        <aside className="w-56 shrink-0">
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
      </section>
    </article>
  );
}
