"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { CloudUploadIcon } from "@hugeicons/core-free-icons";

export default function IngestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const cameraIdFromUrl = searchParams.get("camera") ?? "";
  const cameras = useQuery(api.cameras.list);
  const generateUploadUrl = useMutation(api.videos.generateUploadUrl);
  const ingestDirectUpload = useAction(api.videos.ingestDirectUpload);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCamera = cameras?.find(
    (c: Doc<"cameras">) => c._id === cameraIdFromUrl
  );

  useEffect(() => {
    if (!cameraIdFromUrl) {
      router.replace("/cameras");
      return;
    }
    if (!cameras) return;
    const camera = cameras.find((c: Doc<"cameras">) => c._id === cameraIdFromUrl);
    if (!camera) {
      router.replace("/cameras");
    }
  }, [cameraIdFromUrl, cameras, router]);

  const handleUploadIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraIdFromUrl || !title || !file) return;
    setLoading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await ingestDirectUpload({
        cameraId: cameraIdFromUrl as Id<"cameras">,
        title,
        storageId: storageId as Id<"_storage">,
      });
      router.push(`/cameras/${cameraIdFromUrl}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  if (!cameraIdFromUrl || !selectedCamera) {
    return (
      <section className="p-6" aria-label="Loading">
        <p className="text-muted-foreground text-sm">Redirecting…</p>
      </section>
    );
  }

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
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/cameras/${cameraIdFromUrl}`}>{selectedCamera.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ingest Footage</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header>
        <h1 className="text-2xl font-bold">Add video to {selectedCamera.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add video footage to {selectedCamera.name} for AI-powered search and alerting.
        </p>
      </header>

      <Card className="p-6">
        <section className="flex flex-col gap-5">
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

          <form onSubmit={handleUploadIngest} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
              <Label htmlFor="video-file">Video File</Label>
              <p className="text-xs text-muted-foreground">
                Select a video file from your device. MP4, MOV supported. Max 200 MB.
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
                disabled={loading || !title || !file}
              >
                {loading ? "Uploading…" : "Upload & Ingest"}
              </Button>
          </form>
        </section>
      </Card>
    </article>
  );
}
