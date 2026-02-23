"use client";

import { useState, useRef } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, VideoReplayIcon } from "@hugeicons/core-free-icons";

export function IngestVideoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cameraId, setCameraId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cameras = useQuery(api.cameras.list);
  const generateUploadUrl = useMutation(api.videos.generateUploadUrl);
  const ingestDirectUpload = useAction(api.videos.ingestDirectUpload);

  const readyCameras = cameras?.filter((c: Doc<"cameras">) => c.twelveLabsIndexId) ?? [];
  const cameraItems = readyCameras.map((c: Doc<"cameras">) => ({
    value: c._id,
    label: `${c.name} — ${c.location}`,
  }));

  const resetForm = () => {
    setTitle("");
    setFile(null);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleUploadIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraId || !title || !file) return;
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
        cameraId: cameraId as Id<"cameras">,
        title,
        storageId: storageId as Id<"_storage">,
      });
      setOpen(false);
      resetForm();
      router.push(`/cameras/${cameraId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="default" size="default" className="w-full justify-start gap-3">
            <HugeiconsIcon icon={VideoReplayIcon} size={16} />
            Ingest video
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ingest video</DialogTitle>
          <DialogDescription>
            Add video footage to a camera&apos;s index for AI-powered search and alerting.
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <Label htmlFor="modal-camera">Camera</Label>
            <p className="text-xs text-muted-foreground">
              Select which camera this footage belongs to.
            </p>
            <Select
              value={cameraId || null}
              onValueChange={(v) => setCameraId(v ?? "")}
              items={cameraItems}
              disabled={readyCameras.length === 0}
            >
              <SelectTrigger id="modal-camera" className="w-full">
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
            <Label htmlFor="modal-title">Title</Label>
            <p className="text-xs text-muted-foreground">
              A short label for this video (e.g. date and time).
            </p>
            <Input
              id="modal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </fieldset>

          <form onSubmit={handleUploadIngest} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
              <Label htmlFor="modal-video-file">Video File</Label>
              <p className="text-xs text-muted-foreground">
                Select a video file from your device. MP4, MOV supported. Max 200 MB.
              </p>
              <label
                htmlFor="modal-video-file"
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
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
                id="modal-video-file"
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
        </section>
      </DialogContent>
    </Dialog>
  );
}
