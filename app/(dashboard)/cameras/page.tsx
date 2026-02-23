"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CameraCard } from "@/components/cameras/CameraCard";
import { AddCameraDialog } from "@/components/cameras/AddCameraDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function CamerasPage() {
  const cameras = useQuery(api.cameras.list);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cameras</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Each camera gets its own AI index. Add footage to start searching.
          </p>
        </div>
        <AddCameraDialog />
      </div>

      {cameras === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : cameras.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No cameras yet.</p>
          <p className="text-xs mt-1">
            Add your first camera to get started — a Twelve Labs index will be
            created automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((camera: Doc<"cameras">) => (
            <CameraCard key={camera._id} camera={camera} />
          ))}
        </div>
      )}
    </div>
  );
}
