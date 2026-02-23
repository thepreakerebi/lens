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
    <article className="p-6 flex flex-col gap-6 max-w-5xl">
      <header className="flex items-center justify-between">
        <section>
          <h1 className="text-2xl font-bold">Cameras</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Each camera gets its own AI index. Add footage to start searching.
          </p>
        </section>
        <AddCameraDialog />
      </header>

      {cameras === undefined ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-36 rounded-lg" />
            </li>
          ))}
        </ul>
      ) : cameras.length === 0 ? (
        <section className="text-center py-16 text-muted-foreground" aria-label="Empty state">
          <p className="text-sm">No cameras yet.</p>
          <p className="text-xs mt-1">
            Add your first camera to get started — an AI index will be created
            automatically so you can search footage.
          </p>
        </section>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0 m-0">
          {cameras.map((camera: Doc<"cameras">) => (
            <li key={camera._id}>
              <CameraCard camera={camera} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
