"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Alert01Icon,
  Settings01Icon,
  DashboardSpeed01Icon,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
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
  { href: "/alerts", label: "Alerts", icon: Alert01Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
];

function SidebarUserProfile() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  if (!user) {
    return (
      <section className="px-2 py-3" aria-label="User profile">
        <p className="text-xs text-muted-foreground truncate">Loading…</p>
      </section>
    );
  }

  const image = (user as { image?: string }).image;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <Link
      href="/settings"
      className="flex items-center gap-3 px-2 py-3 rounded-md hover:bg-sidebar-accent transition-colors w-full min-w-0"
      aria-label="View profile and settings"
    >
      <Avatar size="sm" className="shrink-0 size-8">
        {image ? (
          <AvatarImage src={image} alt="" />
        ) : null}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <section className="flex flex-col min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{user.name ?? "User"}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </section>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncProfile = useMutation(api.auth.syncProfile);
  const syncedRef = useRef(false);
  const unreadIncidents = useQuery(
    api.alerts.listIncidents,
    isAuthenticated ? { unreadOnly: true } : "skip"
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  // Sync user profile so alert emails can resolve the address (runs once per session)
  useEffect(() => {
    if (!isAuthenticated || syncedRef.current) return;
    authClient.getSession().then((session) => {
      const u = session?.data?.user;
      if (u?.email) {
        syncedRef.current = true;
        syncProfile({
          email: u.email,
          name: u.name ?? undefined,
          image: (u as { image?: string }).image ?? undefined,
        }).catch(() => { syncedRef.current = false; });
      }
    });
  }, [isAuthenticated, syncProfile]);

  if (isLoading || !isAuthenticated) {
    return (
      <section
        className="min-h-screen flex items-center justify-center"
        aria-label={!isAuthenticated ? "Redirecting to sign in" : "Loading"}
      >
        <p className="text-muted-foreground text-sm">
          {!isAuthenticated ? "Redirecting to sign in…" : "Loading…"}
        </p>
      </section>
    );
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar>
        <SidebarHeader className="flex h-14 shrink-0 items-center border-b border-sidebar-border">
          <SidebarGroup>
            <SidebarGroupContent className="flex items-center gap-2 px-2">
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
              <SidebarUserProfile />
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

      <OnboardingChecklist />
    </SidebarProvider>
  );
}
