"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { syncProfile } from "./actions";
import OnboardingForm from "./onboarding-form";
import { DashboardNavbar } from "@/components/dashboard/navbar";

export default function ClientOnboarding({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [showForm, setShowForm] = useState(false);

  const handleStart = async () => {
    await syncProfile();
    setShowForm(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNavbar />
      <main className="flex-1">
        {showForm ? (
          <OnboardingForm userId={userId} />
        ) : (
          <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md"
            >
              <div className="mb-8 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
              </div>
              <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight">
                Welcome to TaBLR, <span className="text-primary">{userName}</span>
              </h1>
              <p className="mb-10 text-lg text-muted-foreground">
                Tablr matches people based on their culinary taste and professional interests. Let&apos;s
                build your profile.
              </p>

              <button
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                Create My Profile <ArrowRight className="h-5 w-5" />
              </button>

              <p className="mt-8 text-sm text-muted-foreground">
                Takes about 2 minutes. No credit card required.
              </p>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
