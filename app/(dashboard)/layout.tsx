"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Search01Icon,
  Alert01Icon,
  Settings01Icon,
  DashboardSpeed01Icon,
  LogoutSquare01Icon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { IngestVideoModal } from "@/components/ingest/IngestVideoModal";
import { BreadcrumbProvider, useBreadcrumbs } from "@/components/providers/BreadcrumbProvider";

function HeaderBreadcrumbs() {
  const { items } = useBreadcrumbs();
  if (items.length === 0) return null;
  return (
    <>
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {items.flatMap((item, i) => {
            const isLast = i === items.length - 1;
            const elements = [
              <BreadcrumbItem key={`item-${i}`}>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href ?? "#"}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ];
            if (!isLast) {
              elements.push(<BreadcrumbSeparator key={`sep-${i}`} />);
            }
            return elements;
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}

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
      <section
        className="min-h-screen flex items-center justify-center"
        aria-label="Loading"
      >
        <p className="text-muted-foreground text-sm">Loading…</p>
      </section>
    );
  }

  if (!isAuthenticated) return null;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
  };

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarGroup>
            <SidebarGroupContent className="flex items-center gap-2 px-2 py-1">
              <h2 className="text-lg font-bold tracking-tight">Lens</h2>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(href);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={isActive}
                      >
                        <HugeiconsIcon icon={Icon} size={16} className="shrink-0" />
                        {label}
                        {label === "Alerts" && (unreadIncidents?.length ?? 0) > 0 ? (
                          <Badge
                            variant="destructive"
                            className="ml-auto text-xs px-1.5 py-0"
                          >
                            {unreadIncidents!.length}
                          </Badge>
                        ) : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupContent>
              <IngestVideoModal />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarGroup>
            <SidebarGroupContent>
              <Button
                variant="ghost"
                size="default"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <HugeiconsIcon icon={LogoutSquare01Icon} size={16} />
                Sign out
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-0 overflow-hidden">
        <BreadcrumbProvider>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <HeaderBreadcrumbs />
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
