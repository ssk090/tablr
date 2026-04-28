"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, MessageSquare, Plus, Sparkles, Utensils, Loader2 } from "lucide-react";
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
          <div className="relative h-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-accent/5 p-10 border border-white/5">
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
          <div className="flex h-full flex-col justify-center rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-md">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">Tablr Concierge</h3>
            <p className="mb-6 text-muted-foreground">
              {stats?.activeRequests && stats.activeRequests > 0 
                ? `I'm currently searching for dining partners for your ${stats.activeRequests} open request(s).`
                : "Hi! I'm your dining concierge. I haven't found any matches for you yet. Tell me when you're free to eat!"}
            </p>
            <Link
              href="/dashboard/new-dinner"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm font-semibold transition-all hover:bg-white/5"
            >
              <MessageSquare className="h-4 w-4" /> Start a conversation
            </Link>
          </div>
        </motion.div>

        {/* Stats/Status Section */}
        <motion.div variants={item} className="grid gap-6 md:grid-cols-2 lg:col-span-3">
          {statsConfig.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.01] p-6 transition-all hover:bg-white/[0.03]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
                {stat.icon}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                )}
              </div>
            </div>
          ))}
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
