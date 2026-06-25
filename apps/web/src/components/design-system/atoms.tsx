"use client";

import { type ClassValue, clsx } from "clsx";
import type { ReactElement, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>): ReactElement {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border bg-background/70 p-4 text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  return (
    <label
      className={cn("text-xs font-bold uppercase tracking-widest text-muted-foreground", className)}
    >
      {children}
    </label>
  );
}

export function Card({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/80 bg-secondary/25 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.02]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingSection({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  readonly id?: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  return (
    <section id={id} className={cn("relative scroll-mt-24 py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
          <h2 className="mb-6 font-serif text-4xl font-bold text-foreground md:text-6xl">
            {title}
          </h2>
          {description ? (
            <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly className?: string;
}): ReactElement {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/70 bg-secondary/30 transition-all hover:-translate-y-1 hover:border-border hover:bg-secondary/50",
        className,
      )}
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary/20">
        {icon}
      </div>
      <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
    </Card>
  );
}

export function GlassPanel({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): ReactElement {
  return (
    <Card
      className={cn(
        "border-border/70 bg-secondary/30 p-6 backdrop-blur-md transition-colors hover:border-border hover:bg-secondary/50",
        className,
      )}
    >
      {children}
    </Card>
  );
}
