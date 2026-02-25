"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon, Location01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface CameraCardProps {
  camera: Doc<"cameras">;
}

export function CameraCard({ camera }: CameraCardProps) {
  const [cameraToDelete, setCameraToDelete] = useState<Doc<"cameras"> | null>(null);
  const removeCamera = useMutation(api.cameras.remove);

  return (
    <>
      <Link href={`/cameras/${camera._id}`} className="block">
        <Card className="p-5 flex flex-col gap-4 hover:border-primary/50 transition-colors cursor-pointer relative">
          <header className="flex items-start justify-between">
            <figure
              className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center m-0"
              aria-hidden
            >
              <HugeiconsIcon icon={Camera01Icon} size={20} className="text-primary" />
            </figure>
            <section className="flex items-center gap-1" aria-label="Camera actions">
              <Badge
                variant={camera.status === "active" ? "default" : "secondary"}
                className="text-xs"
              >
                {camera.status}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCameraToDelete(camera);
                }}
                aria-label={`Delete camera ${camera.name}`}
              >
                <HugeiconsIcon icon={Delete01Icon} size={16} />
              </Button>
            </section>
          </header>

          <section className="flex flex-col gap-1">
            <strong className="font-semibold text-sm">{camera.name}</strong>
            <p className="flex items-center gap-1 text-xs text-muted-foreground m-0">
              <HugeiconsIcon icon={Location01Icon} size={12} aria-hidden />
              {camera.location}
            </p>
          </section>

          <p className="text-xs text-muted-foreground m-0">
            {camera.twelveLabsIndexId ? (
              <small className="text-green-600">Index ready</small>
            ) : (
              <small className="text-yellow-600">Creating index…</small>
            )}
          </p>
        </Card>
      </Link>

      <AlertDialog
        open={cameraToDelete !== null}
        onOpenChange={(open) => !open && setCameraToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete camera</AlertDialogTitle>
            <AlertDialogDescription>
              {cameraToDelete ? (
                <>
                  Are you sure you want to delete &quot;{cameraToDelete.name}&quot;?
                  All footage and incidents for this camera will be removed. This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 hover:text-white"
              onClick={() => {
                if (cameraToDelete) {
                  removeCamera({ id: cameraToDelete._id });
                  setCameraToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
