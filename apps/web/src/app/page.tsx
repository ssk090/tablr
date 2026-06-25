"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { FeatureCard, GlassPanel, LandingSection } from "@/components/design-system/atoms";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { NumberTicker } from "@/components/ui/number-ticker";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Handshake, MailCheck, MapPin, Sparkles, Users, Utensils } from "lucide-react";
import Link from "next/link";

interface CommunityStats {
  readonly diners: number;
  readonly dinnersHosted: number;
  readonly neighbourhoods: number;
}

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats({ diners: 0, dinnersHosted: 0, neighbourhoods: 0 }));
  }, []);

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
      <nav className="fixed top-0 z-50 w-full border-b border-border/70 bg-background/70 backdrop-blur-xl">
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
            <AnimatedThemeToggler />
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

          <div className="flex items-center gap-4 md:hidden">
            <Link
              href="#how-it-works"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              How
            </Link>
            <Link
              href="#community"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Community
            </Link>
            <AnimatedThemeToggler />
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

          {/* Community Stats Bar */}
          <motion.div
            variants={item}
            className="mx-auto mb-16 grid max-w-3xl grid-cols-3 gap-4 rounded-3xl border border-border/60 bg-secondary/30 px-8 py-6 backdrop-blur-md"
          >
            <div className="text-center">
              <NumberTicker value={stats?.diners ?? 0} className="text-3xl font-bold text-primary" />
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Diners
              </p>
            </div>
            <div className="text-center">
              <NumberTicker value={stats?.dinnersHosted ?? 0} className="text-3xl font-bold text-primary" startValue={0} />
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Dinners Hosted
              </p>
            </div>
            <div className="text-center">
              <NumberTicker value={stats?.neighbourhoods ?? 0} className="text-3xl font-bold text-primary" startValue={0} />
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Neighbourhoods
              </p>
            </div>
          </motion.div>

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
              className="flex h-14 w-full items-center justify-center rounded-full border border-border/80 bg-secondary/50 px-8 text-lg font-semibold text-foreground backdrop-blur-md transition-all hover:bg-secondary/80 sm:w-auto"
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
          className="absolute right-[10%] top-[20%] hidden rounded-2xl border border-border/80 bg-secondary/60 p-4 shadow-lg shadow-primary/10 backdrop-blur-xl md:block"
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
          className="absolute left-[15%] bottom-[20%] hidden rounded-2xl border border-border/80 bg-secondary/60 p-4 shadow-lg shadow-primary/10 backdrop-blur-xl md:block"
        >
          <Users className="h-8 w-8 text-primary" />
        </motion.div>
      </section>

      {/* How It Works */}
      <motion.div
        id="how-it-works"
        className="scroll-mt-24"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <LandingSection
          eyebrow="How it works"
          title="Match first. Book only when everyone says yes."
          description="Tablr is people-first: discover compatible Bangalore diners by cuisine, neighbourhood, interests, and vibe before the restaurant reservation begins."
        >
          <motion.div
            className="grid gap-8 md:grid-cols-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {[
              {
                icon: <Users className="h-6 w-6" />,
                title: "Create your taste profile",
                desc: "Share your interests, profession, favourite cuisines, and preferred Bangalore neighbourhoods.",
              },
              {
                icon: <MapPin className="h-6 w-6" />,
                title: "Find compatible diners",
                desc: "Search for people who share your food cravings, location preferences, and conversation style.",
              },
              {
                icon: <MailCheck className="h-6 w-6" />,
                title: "Send a mutual invite",
                desc: "Invite someone by email. Both diners accept before anything moves toward a table booking.",
              },
              {
                icon: <Calendar className="h-6 w-6" />,
                title: "Confirm, then reserve",
                desc: "Once both confirm, the Swiggy Dineout agent helps coordinate and book the right restaurant.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="flex"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <FeatureCard icon={feature.icon} title={feature.title} description={feature.desc} />
              </motion.div>
            ))}
          </motion.div>
        </LandingSection>
      </motion.div>

      {/* Community */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <section id="community" className="relative scroll-mt-24 overflow-hidden py-32">
          <div className="absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-accent">
                Community
              </p>
              <h2 className="mb-6 font-serif text-4xl font-bold text-foreground md:text-6xl">
                A warmer way to meet people over food.
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                Join curious founders, designers, operators, engineers, artists, and food lovers
                across Indiranagar, HSR, Koramangala, Jayanagar, and beyond. Every match is built
                around shared tastes and mutual intent—not random networking.
              </p>
              <Link
                href={isLoaded && isSignedIn ? "/dashboard" : "/sign-up"}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
              >
                Join the Community <ArrowRight className="h-5 w-5" />
              </Link>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Japanese near Indiranagar", "Matched with a product designer who also loves jazz bars."],
                ["South Indian brunch in Jayanagar", "Met a founder comparing filter coffee notes and favourite book lists."],
                ["Korean BBQ around HSR", "A low-pressure dinner with another new-to-Bangalore professional."],
                ["Chef-led tasting in Koramangala", "Four diners, shared curiosity, one carefully coordinated table."],
              ].map(([title, desc], i) => (
                <motion.div
                  key={title}
                  className="flex"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 + 0.2 }}
                >
                  <GlassPanel>
                    <Handshake className="mb-5 h-7 w-7 text-accent shrink-0" />
                    <h3 className="mb-3 font-serif text-xl font-bold text-foreground">{title}</h3>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </GlassPanel>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative overflow-hidden border-t border-border/70 py-20 text-center">
        <FlickeringGrid
          aria-hidden="true"
          className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          squareSize={4}
          gridGap={8}
          flickerChance={0.25}
          color="rgb(154, 104, 19)"
          maxOpacity={0.28}
        />
        <div className="relative mx-auto max-w-7xl px-6">
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Tablr<span className="text-primary">.</span>
          </span>
          <p className="mt-4 text-sm text-muted-foreground">
            © 2026 Tablr Social Dining. Crafted for Bangalore Professionals.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
