"use client";

import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Sparkles, User, Utensils } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNavbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "New Dinner", href: "/dashboard/new-dinner", icon: Utensils },
    { label: "Profile", href: "/dashboard/profile", icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight">
              Tablr
              <span className="text-primary group-hover:text-red-500 transition-colors">.</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                  {item.label}
                  {isActive && (
                    <span className="h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(139,26,26,0.6)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              AI Concierge
            </span>
          </div>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
