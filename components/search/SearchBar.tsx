"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

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

  const searchInput = (
    <form onSubmit={handleSearch} className="flex gap-2 flex-1">
      {cameras && cameras.length > 0 && !compact && (
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="h-12 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
          aria-label="Filter by camera"
        >
          <option value="">All cameras</option>
          {cameras.map((c: Doc<"cameras">) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <Input
        id={compact ? undefined : "search-query"}
        placeholder=""
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
        aria-label={compact ? "Search footage" : "Search query"}
      />
      <Button type="submit" disabled={loading || !query.trim()}>
        <HugeiconsIcon icon={Search01Icon} size={16} className="mr-2" />
        {loading ? "Searching…" : "Search"}
      </Button>
    </form>
  );

  if (compact) {
    return searchInput;
  }

  return (
    <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
      <Label htmlFor="search-query">Search</Label>
      <p className="text-xs text-muted-foreground">
        Describe what you&apos;re looking for (e.g. person climbing fence, car
        in parking lot).
      </p>
      {searchInput}
    </fieldset>
  );
}
