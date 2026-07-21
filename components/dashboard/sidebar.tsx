"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Clapperboard,
  CalendarDays,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/videos", label: "Videos", icon: Clapperboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-surface">
      <div className="flex items-center gap-2 px-5 h-16 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <span className="font-semibold tracking-tight">AutoSocial AI</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-muted-surface hover:text-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="rounded-lg bg-primary-soft p-3">
          <p className="text-xs font-semibold text-primary">Professional Plan</p>
          <p className="text-xs text-muted mt-0.5">42 / 100 videos this month</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
            <div className="h-full w-[42%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </aside>
  );
}
