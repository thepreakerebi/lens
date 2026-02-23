"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon } from "@hugeicons/core-free-icons";

export function AddCameraDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const createCamera = useMutation(api.cameras.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;
    setLoading(true);
    try {
      await createCamera({ name, location });
      setName("");
      setLocation("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <HugeiconsIcon icon={AddCircleIcon} size={16} className="mr-2" />
            Add Camera
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Add Camera</DialogTitle>
          <DialogDescription>
            An AI search index will be created automatically so you can search
            and analyze footage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <Label htmlFor="name">Camera name</Label>
            <p className="text-xs text-muted-foreground">
              A short name to identify this camera.
            </p>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </fieldset>
          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <Label htmlFor="location">Location</Label>
            <p className="text-xs text-muted-foreground">
              Where the camera is positioned (e.g. building, floor, area).
            </p>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </fieldset>
          <footer className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name || !location}
            >
              {loading ? "Creating…" : "Create Camera"}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
