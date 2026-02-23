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
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <HugeiconsIcon icon={Camera01Icon} size={20} className="text-primary" />
          </div>
          <Badge
            variant={camera.status === "active" ? "default" : "secondary"}
            className="text-xs"
          >
            {camera.status}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-semibold text-sm">{camera.name}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Location01Icon} size={12} />
            {camera.location}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {camera.twelveLabsIndexId ? (
            <span className="text-green-600">Index ready</span>
          ) : (
            <span className="text-yellow-600">Creating index…</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
