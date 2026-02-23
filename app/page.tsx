import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Search01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";

const features = [
  {
    icon: Camera01Icon,
    title: "AI-Powered Detection",
    description:
      "Twelve Labs Pegasus analyzes footage and automatically detects incidents — intrusions, accidents, crowd disturbances — in real time.",
  },
  {
    icon: Search01Icon,
    title: "Natural Language Search",
    description:
      'Ask "show me incidents near gate B between 2–4pm" and get matching clips with timestamps instantly.',
  },
  {
    icon: Alert01Icon,
    title: "Automated Alerting",
    description:
      "Configure rules in plain English. Get notified by email or webhook the moment a match is found.",
  },
];

const stack = [
  "Next.js 16",
  "Convex",
  "Twelve Labs",
  "Better Auth",
  "Resend",
  "shadcn/ui",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <Badge variant="secondary" className="text-xs">
          BeOrchid Africa Developers Hackathon 2026
        </Badge>

        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          AI-Powered CCTV Monitoring for the Real World
        </h1>

        <p className="text-muted-foreground max-w-xl text-lg">
          Lens lets security operators search hours of footage in seconds and
          receive automated alerts — without watching a single screen.
        </p>

        <div className="flex gap-3">
          <Link href="/sign-in">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <HugeiconsIcon icon={Icon} size={20} className="text-primary" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </section>

      {/* Stack badges */}
      <section className="flex flex-col items-center gap-4 pb-16 px-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          Built with
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {stack.map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
      </section>
    </main>
  );
}
