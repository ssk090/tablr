"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, MessageSquare, Plus, Sparkles, Utensils } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import Link from "next/link";
import { getDashboardStats } from "./actions";

export default function Dashboard() {
  const { user } = useUser();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const statsConfig = [
    { label: "Active Requests", value: stats?.activeRequests ?? "0", icon: <Utensils className="h-5 w-5" /> },
    { label: "Confirmed Dinners", value: stats?.confirmedDinners ?? "0", icon: <Calendar className="h-5 w-5" /> },
    {
      label: "Favorite Area",
      value: stats?.favoriteArea ?? "Not set",
      icon: <MapPin className="h-5 w-5" />,
    },
    { label: "Dining Partners", value: stats?.diningPartners ?? "0", icon: <Users className="h-5 w-5" /> },
    { label: "Pending Invites", value: stats?.pendingInvites ?? "0", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Accepted Matches", value: stats?.acceptedMatches ?? "0", icon: <Sparkles className="h-5 w-5" /> },
  ];

  return (
    <main className="mx-auto max-w-7xl p-6 lg:p-12">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 lg:grid-cols-3"
      >
        {/* Welcome Card */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="relative h-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-accent/5 p-10 border border-border/60">
            <div className="relative z-10 flex h-full flex-col justify-center">
              <h1 className="mb-4 font-serif text-5xl font-bold tracking-tight">
                Welcome back, <span className="text-primary">{user?.firstName || "Diner"}</span>
              </h1>
              <p className="mb-8 max-w-md text-lg text-muted-foreground">
                Ready for your next culinary adventure in{" "}
                <span className="font-semibold text-foreground">
                  {stats?.favoriteArea && stats.favoriteArea !== "Not set" 
                    ? stats.favoriteArea 
                    : "your area"}
                </span>? Your table is waiting.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard/new-dinner"
                  className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="h-5 w-5" /> I&apos;m looking for dinner
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-primary/20 blur-[80px]" />
          </div>
        </motion.div>

        {/* Concierge Widget */}
        <motion.div variants={item}>
          <div className="flex h-full flex-col justify-center rounded-[2.5rem] border border-border/70 bg-secondary/20 p-8 backdrop-blur-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">Tablr Concierge</h3>
            <p className="mb-6 text-muted-foreground">
              {stats?.activeRequests && stats.activeRequests > 0 
                ? `I'm searching for dining partners for your ${stats.activeRequests} open request(s).`
                : "I haven't found matches for you yet. Tell me when you're free to dine!"}
            </p>
            <Link
              href={stats?.activeRequests && stats.activeRequests > 0 ? "/dashboard/new-dinner?prompt=check" : "/dashboard/new-dinner"}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:scale-[1.02] active:scale-95"
            >
              <MessageSquare className="h-4 w-4" /> {!stats ? "Start a request" : stats.activeRequests > 0 ? "Check matches" : "Tell me your preferences"}
            </Link>
          </div>
        </motion.div>

        {/* Stats/Status Section */}
        <motion.div variants={item} className="grid gap-6 md:grid-cols-2 lg:col-span-3">
          {statsConfig.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-3xl border border-border/70 bg-secondary/20 p-6 transition-all hover:bg-secondary/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                {stat.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
                {isLoading ? (
                  <div className="mt-1 h-8 w-20 animate-skeleton rounded-md bg-black/20 dark:bg-white/20" />
                ) : typeof stat.value === "string" && isNaN(Number(stat.value)) ? (
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                ) : (
                  <NumberTicker
                    value={Number(stat.value)}
                    className="text-2xl font-bold"
                  />
                )}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div variants={item} className="lg:col-span-3">
          <div className="rounded-[2.5rem] border border-border/70 bg-secondary/20 p-8">
            <h2 className="mb-6 font-serif text-3xl font-bold">Your Matches</h2>
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-3xl border border-border/70 bg-secondary/20 p-5"
                  >
                    <div className="h-7 w-3/4 animate-skeleton rounded-md bg-black/20 dark:bg-white/20" />
                    <div className="mt-1 h-4 w-1/2 animate-skeleton rounded-md bg-black/15 dark:bg-white/15" />
                    <div className="mt-4 h-4 w-1/4 animate-skeleton rounded-md bg-black/15 dark:bg-white/15" />
                    <div className="mt-2 h-4 w-2/3 animate-skeleton rounded-md bg-black/15 dark:bg-white/15" />
                  </div>
                ))}
              </div>
            ) : stats?.connectedPeople?.length ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stats.connectedPeople.map((match) => (
                  <Link
                    key={`${match.event.id}-${match.profile.id}`}
                    href={`/dashboard/profiles/${match.profile.id}?eventId=${match.event.id}`}
                    className="group relative overflow-hidden rounded-3xl border border-border/70 bg-secondary/20 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-secondary/40 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <p className="text-lg font-bold transition-colors group-hover:text-primary">{match.profile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[match.profile.professionalTitle, match.profile.company].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-widest text-primary">{match.status}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{match.event.restaurantName} · {match.event.scheduledDate}</p>
                    <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No connected profiles yet. Start a dinner request to find matches.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Calendar Icon</title>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Users Icon</title>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
