"use client";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/5 p-4 transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/30",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label
      className={cn("text-xs font-bold uppercase tracking-widest text-muted-foreground", className)}
    >
      {children}
    </label>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
