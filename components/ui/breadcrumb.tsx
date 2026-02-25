"use client";

import * as React from "react";
import { ChevronRight } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

function Breadcrumb({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex", className)}
      {...props}
    />
  );
}

function BreadcrumbList({
  className,
  ...props
}: React.ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  asChild,
  children,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  const linkClassName = cn(
    "transition-colors hover:text-foreground",
    className
  );
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(linkClassName, child.props.className),
    });
  }
  return (
    <a className={linkClassName} {...props}>
      {children}
    </a>
  );
}

function BreadcrumbPage({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("[&>svg]:size-3.5", className)}
      role="presentation"
      {...props}
    >
      {children ?? <HugeiconsIcon icon={ChevronRight} aria-hidden />}
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
