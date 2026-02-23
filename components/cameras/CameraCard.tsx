import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";
import { Camera01Icon, Location01Icon } from "@hugeicons/react";

interface CameraCardProps {
  camera: Doc<"cameras">;
}

export function CameraCard({ camera }: CameraCardProps) {
  return (
    <Link href={`/cameras/${camera._id}`}>
      <Card className="p-5 flex flex-col gap-4 hover:border-primary/50 transition-colors cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Camera01Icon className="h-5 w-5 text-primary" />
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
            <Location01Icon className="h-3 w-3" />
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
