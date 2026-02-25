"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { AlertRuleForm } from "@/components/alerts/AlertRuleForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import { AddCircleIcon, Delete01Icon, LogoutSquare01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const router = useRouter();
  const [showRuleForm, setShowRuleForm] = useState(false);
  const cameras = useQuery(api.cameras.list);
  const alertRules = useQuery(api.alerts.listAlertRules);
  const deleteRule = useMutation(api.alerts.deleteAlertRule);
  const updateRule = useMutation(api.alerts.updateAlertRule);

  const { data: session } = authClient.useSession();
  const user = session?.user;

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
  };

  return (
    <article className="p-6 flex flex-col gap-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and alert rules.
        </p>
      </header>

      <Tabs defaultValue="profile" className="flex flex-col gap-6">
        <header className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background border-b border-border">
          <TabsList variant="line" className="w-fit">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="alert-rules">Alert Rules</TabsTrigger>
          </TabsList>
        </header>

        <TabsContent value="profile" className="mt-0">
          <Card className="p-6 flex flex-col gap-6">
            <section className="flex flex-col gap-4" aria-labelledby="profile-heading">
              <h2 id="profile-heading" className="text-base font-semibold">
                Account
              </h2>
              {user ? (
                <section className="flex items-center gap-4">
                  <Avatar size="lg" className="size-16 shrink-0">
                    {(user as { image?: string }).image ? (
                      <AvatarImage
                        src={(user as { image?: string }).image}
                        alt=""
                      />
                    ) : null}
                    <AvatarFallback className="text-lg">
                      {user.name
                        ? user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : user.email?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <section className="flex flex-col gap-0.5 min-w-0">
                    <p className="font-medium">{user.name ?? "User"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </section>
                </section>
              ) : (
                <Skeleton className="h-16 w-64" />
              )}
            </section>

            <Separator />

            <section className="flex flex-col gap-2" aria-label="Sign out">
              <Button
                variant="outline"
                className="w-fit text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <HugeiconsIcon icon={LogoutSquare01Icon} size={16} className="mr-2" />
                Log out
              </Button>
            </section>
          </Card>
        </TabsContent>

        <TabsContent value="alert-rules" className="mt-0">
          <Card className="p-6 flex flex-col gap-4">
            <header className="flex items-center justify-between">
              <section>
                <h2 className="text-base font-semibold">Alert Rules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Natural-language rules that trigger incident alerts when matched.
                </p>
              </section>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRuleForm((v) => !v)}
              >
                <HugeiconsIcon icon={AddCircleIcon} size={16} className="mr-2" />
                Add Rule
              </Button>
            </header>

                {showRuleForm && (
              <>
                <Separator />
                <AlertRuleForm
                  cameras={cameras ?? []}
                  onSuccess={() => setShowRuleForm(false)}
                />
              </>
            )}

            <Separator />

                {alertRules === undefined ? (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-14 rounded" />
                  </li>
                ))}
              </ul>
            ) : alertRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alert rules yet.</p>
                ) : (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {alertRules.map((rule: Doc<"alertRules">) => (
                  <li
                    key={rule._id}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <section className="flex flex-col gap-1 flex-1 min-w-0">
                      <header className="flex items-center gap-2">
                        <strong className="text-sm font-medium">{rule.name}</strong>
                        <Badge
                          variant={rule.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {rule.isActive ? "active" : "paused"}
                        </Badge>
                        {rule.emailNotification && (
                          <Badge variant="outline" className="text-xs">
                            email
                          </Badge>
                        )}
                      </header>
                      <p className="text-xs text-muted-foreground truncate">
                        {rule.description}
                      </p>
                      {rule.webhookUrl && (
                        <p className="text-xs text-muted-foreground truncate">
                          Webhook: {rule.webhookUrl}
                        </p>
                      )}
                    </section>
                    <section className="flex items-center gap-1 shrink-0" aria-label="Rule actions">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateRule({ id: rule._id, isActive: !rule.isActive })
                        }
                      >
                        {rule.isActive ? "Pause" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteRule({ id: rule._id })}
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={16} />
                      </Button>
                    </section>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </article>
  );
}
