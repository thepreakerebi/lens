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
      <header className="flex items-center justify-between">
        <small className="text-base text-muted-foreground">{label}</small>
        <figure
          className={`w-8 h-8 rounded-md flex items-center justify-center m-0 ${
            highlight ? "bg-destructive/10" : "bg-primary/10"
          }`}
          aria-hidden
        >
          <HugeiconsIcon
            icon={icon}
            size={16}
            className={highlight ? "text-destructive" : "text-primary"}
          />
        </figure>
      </header>
      <p className={`text-3xl font-bold m-0 ${highlight ? "text-destructive" : ""}`}>
        {value}
      </p>
    </Card>
  );
}
