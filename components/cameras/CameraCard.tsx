import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon, Location01Icon } from "@hugeicons/core-free-icons";

interface CameraCardProps {
  camera: Doc<"cameras">;
}

export function CameraCard({ camera }: CameraCardProps) {
  return (
    <Link href={`/cameras/${camera._id}`}>
      <Card className="p-5 flex flex-col gap-4 hover:border-primary/50 transition-colors cursor-pointer">
        <header className="flex items-start justify-between">
          <figure
            className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center m-0"
            aria-hidden
          >
            <HugeiconsIcon icon={Camera01Icon} size={20} className="text-primary" />
          </figure>
          <Badge
            variant={camera.status === "active" ? "default" : "secondary"}
            className="text-xs"
          >
            {camera.status}
          </Badge>
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
  );
}
