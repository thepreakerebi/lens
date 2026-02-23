"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddCircleIcon } from "@hugeicons/react";

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
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <AddCircleIcon className="h-4 w-4 mr-2" />
        Add Camera
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-background rounded-lg border p-6 w-full max-w-sm shadow-lg flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold">Add Camera</h2>
              <p className="text-sm text-muted-foreground mt-1">
                A Twelve Labs index will be created automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Camera name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Front Gate Camera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Building A, Main Entrance"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
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
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
