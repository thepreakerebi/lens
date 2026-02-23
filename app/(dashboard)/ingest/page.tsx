"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useSearchParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, LinkSquare01Icon } from "@hugeicons/core-free-icons";

export default function IngestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const cameras = useQuery(api.cameras.list);
  const generateUploadUrl = useMutation(api.videos.generateUploadUrl);
  const ingestByUrl = useAction(api.videos.ingestByUrl);
  const ingestDirectUpload = useAction(api.videos.ingestDirectUpload);

  const preselectedCamera = searchParams.get("camera");
  const [cameraId, setCameraId] = useState<string>(preselectedCamera ?? "");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraId || !title || !url) return;
    setLoading(true);
    setError(null);
    try {
      await ingestByUrl({
        cameraId: cameraId as Id<"cameras">,
        title,
        sourceUrl: url,
      });
      router.push(`/cameras/${cameraId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraId || !title || !file) return;
    setLoading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await ingestDirectUpload({
        cameraId: cameraId as Id<"cameras">,
        title,
        storageId: storageId as Id<"_storage">,
      });
      router.push(`/cameras/${cameraId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const readyCameras = cameras?.filter((c: Doc<"cameras">) => c.twelveLabsIndexId) ?? [];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Ingest Footage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add video footage to a camera&apos;s index for AI-powered search and alerting.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5">
          {/* Camera selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="camera">Camera</Label>
            <select
              id="camera"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a camera…</option>
              {readyCameras.map((c: Doc<"cameras">) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.location}
                </option>
              ))}
            </select>
            {cameras && cameras.length > 0 && readyCameras.length === 0 && (
              <p className="text-xs text-yellow-600">
                Cameras are still creating their Twelve Labs index. Please wait a moment.
              </p>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Footage 2026-02-23 08:00"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-md border overflow-hidden w-fit">
            {(["url", "upload"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm transition-colors ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "url" ? "URL" : "Upload"}
              </button>
            ))}
          </div>

          {tab === "url" ? (
            <form onSubmit={handleUrlIngest} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="url">Video URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://example.com/footage.mp4"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(url, "_blank")}
                    disabled={!url}
                  >
                    <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Direct video URL (MP4, MOV, etc.). Up to 4 GB.
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !cameraId || !title || !url}
              >
                {loading ? "Ingesting…" : "Ingest Video"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleUploadIngest} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Video File</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  <HugeiconsIcon icon={CloudUploadIcon} size={32} className="text-muted-foreground" />
                  {file ? (
                    <span className="text-sm font-medium">{file.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Click to select a video file
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !cameraId || !title || !file}
              >
                {loading ? "Uploading…" : "Upload & Ingest"}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
