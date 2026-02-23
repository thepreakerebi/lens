"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Camera01Icon, Search01Icon, Alert01Icon, Settings01Icon, DashboardSpeed01Icon, LogoutSquare01Icon } from "@hugeicons/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSpeed01Icon },
  { href: "/cameras", label: "Cameras", icon: Camera01Icon },
  { href: "/search", label: "Search", icon: Search01Icon },
  { href: "/alerts", label: "Alerts", icon: Alert01Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const unreadIncidents = useQuery(api.alerts.listIncidents, {
    unreadOnly: true,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r shrink-0">
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="text-lg font-bold tracking-tight">Lens</span>
          <span className="text-xs text-muted-foreground">by Watchwise</span>
        </div>

        <Separator />

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
                {label === "Alerts" && (unreadIncidents?.length ?? 0) > 0 && (
                  <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0">
                    {unreadIncidents!.length}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogoutSquare01Icon className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
