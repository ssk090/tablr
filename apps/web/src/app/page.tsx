"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Sparkles, Users, Utensils } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  return (
    <div className="relative min-h-screen selection:bg-accent selection:text-accent-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/50 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Tablr<span className="text-primary">.</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How it Works
            </Link>
            <Link
              href="#community"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Community
            </Link>
            {isLoaded && !isSignedIn && (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-foreground transition-colors hover:text-accent"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="group relative overflow-hidden rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10">Join the Table</span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 transition-transform duration-500 group-hover:translate-x-full" />
                </Link>
              </>
            )}
            {isLoaded && isSignedIn && (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-foreground transition-colors hover:text-accent"
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20">
        {/* Background Glows */}
        <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[120px]" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="container relative z-10 mx-auto px-6 text-center"
        >
          <motion.div variants={item} className="mb-6 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                AI-Powered Social Dining
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={item}
            className="mb-8 font-serif text-6xl font-bold leading-[1.1] tracking-tight text-foreground md:text-8xl"
          >
            Dining is a <br />
            <span className="italic text-primary">Social Sport.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
          >
            Tablr matches Bangalore&apos;s most curious professionals for curated dining
            experiences. No awkward networking—just great food and genuine connection.
          </motion.p>

          <motion.div
            variants={item}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            {isLoaded && !isSignedIn && (
              <Link
                href="/sign-up"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 sm:w-auto"
              >
                Start Matching <ArrowRight className="h-5 w-5" />
              </Link>
            )}
            {isLoaded && isSignedIn && (
              <Link
                href="/dashboard"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 sm:w-auto"
              >
                Go to Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            )}
            <Link
              href="#how-it-works"
              className="flex h-14 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-lg font-semibold text-foreground backdrop-blur-md transition-all hover:bg-white/10 sm:w-auto"
            >
              Learn More
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating Decorative Elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute right-[10%] top-[20%] hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:block"
        >
          <Utensils className="h-8 w-8 text-accent" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute left-[15%] bottom-[20%] hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:block"
        >
          <Users className="h-8 w-8 text-primary" />
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section id="how-it-works" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Users className="h-6 w-6" />,
                title: "Curated Matching",
                desc: "Our AI analyzes professional background and interests to find your perfect dinner squad.",
              },
              {
                icon: <Utensils className="h-6 w-6" />,
                title: "Top Restaurants",
                desc: "Access Bangalore's best dining spots, from hidden gems to Michelin-inspired kitchens.",
              },
              {
                icon: <Calendar className="h-6 w-6" />,
                title: "Seamless Booking",
                desc: "We handle the table reservations and coordination. You just show up and enjoy.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary/20">
                  {feature.icon}
                </div>
                <h3 className="mb-4 font-serif text-2xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.desc}</p>
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-20 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Tablr<span className="text-primary">.</span>
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            © 2026 Tablr Social Dining. Crafted for Bangalore Professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
