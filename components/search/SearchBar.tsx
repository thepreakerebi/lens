"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search01Icon } from "@hugeicons/react";

interface SearchBarProps {
  compact?: boolean;
  cameras?: Doc<"cameras">[];
  onSearchStart?: () => void;
  onSearchComplete?: (queryId: Id<"searchQueries">) => void;
}

export function SearchBar({
  compact,
  cameras,
  onSearchStart,
  onSearchComplete,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cameraId, setCameraId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const search = useAction(api.search.naturalLanguageSearch);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (compact) {
      // From dashboard — navigate to search page with query
      router.push(`/search?q=${encodeURIComponent(query)}`);
      return;
    }

    setLoading(true);
    onSearchStart?.();
    try {
      const queryId = await search({
        query: query.trim(),
        cameraId: (cameraId as Id<"cameras">) || undefined,
      });
      onSearchComplete?.(queryId);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      {cameras && cameras.length > 0 && !compact && (
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
        >
          <option value="">All cameras</option>
          {cameras.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <Input
        placeholder={
          compact
            ? "Search footage…"
            : 'e.g. "person climbing fence at night"'
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !query.trim()}>
        <Search01Icon className="h-4 w-4 mr-2" />
        {loading ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
