"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  const selectedCamera = cameras?.find(
    (c: Doc<"cameras">) => c._id === cameraId
  );

  const cameraItems = readyCameras.map((c: Doc<"cameras">) => ({
    value: c._id,
    label: `${c.name} — ${c.location}`,
  }));

  return (
    <article className="p-6 flex flex-col gap-6 max-w-2xl">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/cameras">Cameras</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {selectedCamera ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/cameras/${cameraId}`}>{selectedCamera.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Ingest Footage</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>Ingest Footage</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <header>
        <h1 className="text-2xl font-bold">Ingest Footage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add video footage to a camera&apos;s index for AI-powered search and alerting.
        </p>
      </header>

      <Card className="p-6">
        <section className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <Label htmlFor="camera">Camera</Label>
            <p className="text-xs text-muted-foreground">
              Select which camera this footage belongs to.
            </p>
            <Select
              value={cameraId || null}
              onValueChange={(v) => setCameraId(v ?? "")}
              items={cameraItems}
              disabled={readyCameras.length === 0}
            >
              <SelectTrigger id="camera" className="w-full">
                <SelectValue placeholder="Select a camera…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {readyCameras.map((c: Doc<"cameras">) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name} — {c.location}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {cameras && cameras.length > 0 && readyCameras.length === 0 && (
              <p className="text-sm text-yellow-600">
                Cameras are still being set up. Please wait a moment.
              </p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <Label htmlFor="title">Title</Label>
            <p className="text-xs text-muted-foreground">
              A short label for this video (e.g. date and time).
            </p>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </fieldset>

          <nav className="flex rounded-md border overflow-hidden w-fit" aria-label="Input method">
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
          </nav>

          {tab === "url" ? (
            <form onSubmit={handleUrlIngest} className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
                <Label htmlFor="url">Video URL</Label>
                <p className="text-xs text-muted-foreground">
                  Direct link to a video file (MP4, MOV, etc.). Up to 4 GB.
                </p>
                <section className="flex gap-2" aria-hidden="true">
                  <Input
                    id="url"
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
                </section>
              </fieldset>
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
              <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
                <Label htmlFor="video-file">Video File</Label>
                <p className="text-xs text-muted-foreground">
                  Select a video file from your device. MP4, MOV supported.
                </p>
                <label
                  htmlFor="video-file"
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  <HugeiconsIcon icon={CloudUploadIcon} size={32} className="text-muted-foreground" />
                  {file ? (
                    <strong className="text-sm font-medium">{file.name}</strong>
                  ) : (
                    <small className="text-sm text-muted-foreground">
                      Click to select a video file
                    </small>
                  )}
                </label>
                <input
                  id="video-file"
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </fieldset>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !cameraId || !title || !file}
              >
                {loading ? "Uploading…" : "Upload & Ingest"}
              </Button>
            </form>
          )}
        </section>
      </Card>
    </article>
  );
}
