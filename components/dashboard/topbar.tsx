import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 h-16 px-6 border-b bg-surface/80 backdrop-blur sticky top-0 z-10">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted-surface text-muted">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>
        <Link href="/upload" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="h-4 w-4" />
          New Video
        </Link>
      </div>
    </header>
  );
}
