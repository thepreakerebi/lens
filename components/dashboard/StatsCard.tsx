import { Card } from "@/components/ui/card";
import type { ComponentType } from "react";

interface StatsCardProps {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export function StatsCard({ label, value, icon: Icon, highlight }: StatsCardProps) {
  return (
    <Card className={`p-5 flex flex-col gap-3 ${highlight ? "border-destructive/50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center ${
            highlight ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${highlight ? "text-destructive" : "text-primary"}`}
          />
        </div>
      </div>
      <span
        className={`text-3xl font-bold ${highlight ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </Card>
  );
}
