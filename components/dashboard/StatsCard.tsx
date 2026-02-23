import { Card } from "@/components/ui/card";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

interface StatsCardProps {
  label: string;
  value: number;
  icon: IconSvgElement;
  highlight?: boolean;
}

export function StatsCard({ label, value, icon, highlight }: StatsCardProps) {
  return (
    <Card className={`p-5 flex flex-col gap-3 ${highlight ? "border-destructive/50" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center ${
            highlight ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          <HugeiconsIcon
            icon={icon}
            size={16}
            className={highlight ? "text-destructive" : "text-primary"}
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
