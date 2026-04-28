"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Card, Input, Label } from "@/components/design-system/atoms";
import { saveProfile } from "./actions";
import { type ProfileFormValues, profileSchema } from "./schema";

const CUISINES = [
  "Modern Indian",
  "Italian",
  "Japanese",
  "Steakhouse",
  "Asian Fusion",
  "South Indian",
  "Mediterranean",
  "Craft Cocktails",
];
const AREAS = [
  "Indiranagar",
  "Koramangala",
  "HSR Layout",
  "Lavelle Road",
  "Whitefield",
  "JP Nagar",
  "New BEL Road",
];

export default function OnboardingForm({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);

  const mutation = useMutation({
    mutationFn: (data: ProfileFormValues) => saveProfile(userId, data),
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
  });

  const form = useForm({
    defaultValues: {
      fullName: "",
      professionalTitle: "",
      company: "",
      cuisines: [] as string[],
      preferredAreas: [] as string[],
      bio: "",
    } as ProfileFormValues,
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

  const nextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep((s) => s + 1);
  };

  const prevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setStep((s) => s - 1);
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <div className="relative mb-16 px-10">
        {/* Background Track */}
        <div className="absolute left-14 right-14 top-1/2 h-[2px] -translate-y-1/2 bg-white/5" />

        {/* Progress Track */}
        <div className="absolute left-14 right-14 top-1/2 h-[2px] -translate-y-1/2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((step - 1) / 2) * 100}%` }}
            className="h-full bg-primary shadow-[0_0_10px_rgba(139,26,26,0.4)]"
          />
        </div>

        <div className="relative flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              initial={false}
              animate={{
                scale: step === s ? 1.2 : 1,
                backgroundColor: step >= s ? "hsl(var(--primary))" : "rgb(10, 10, 10)",
                borderColor: step >= s ? "hsl(var(--primary))" : "rgba(255, 255, 255, 0.1)",
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                step >= s
                  ? "text-primary-foreground shadow-[0_0_15px_rgba(139,26,26,0.3)]"
                  : "text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-5 w-5" /> : s}
            </motion.div>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <AnimatePresence mode="wait" custom={step}>
          {step === 1 && (
            <motion.div
              key="step1"
              custom={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="space-y-3">
                <h2 className="font-serif text-4xl font-bold leading-tight">
                  Your Professional Identity
                </h2>
                <p className="text-lg text-muted-foreground/60">
                  We match you with peers in Bangalore&apos;s tech and creative scene.
                </p>
              </div>

              <Card className="space-y-6 border-primary/10 bg-primary/[0.01]">
                <form.Field name="fullName">
                  {(field) => (
                    <div className="space-y-3">
                      <Label>Full Name</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. John Doe"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-sm font-medium text-red-400/90"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                          {field.state.meta.errors[0]?.toString().includes("[object Object]")
                            ? (field.state.meta.errors[0] as { message?: string }).message
                            : field.state.meta.errors[0]?.toString()}
                        </motion.div>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="professionalTitle">
                  {(field) => (
                    <div className="space-y-3">
                      <Label>Professional Title</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Senior Software Architect"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-sm font-medium text-red-400/90"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                          {field.state.meta.errors[0]?.toString().includes("[object Object]")
                            ? (field.state.meta.errors[0] as { message?: string }).message
                            : field.state.meta.errors[0]?.toString()}
                        </motion.div>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field name="company">
                  {(field) => (
                    <div className="space-y-3">
                      <Label>Company</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Google, Zerodha, or Stealth Startup"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-sm font-medium text-red-400/90"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                          {field.state.meta.errors[0]?.toString().includes("[object Object]")
                            ? (field.state.meta.errors[0] as { message?: string }).message
                            : field.state.meta.errors[0]?.toString()}
                        </motion.div>
                      )}
                    </div>
                  )}
                </form.Field>
              </Card>

              <form.Subscribe
                selector={(state) => [state.values.fullName, state.values.professionalTitle, state.values.company]}
              >
                {([fullName, professionalTitle, company]) => (
                  <button
                    onClick={nextStep}
                    disabled={!fullName || !professionalTitle || !company}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-5 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                  >
                    Next: Dining Preferences <ArrowRight className="h-5 w-5" />
                  </button>
                )}
              </form.Subscribe>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="space-y-3">
                <h2 className="font-serif text-4xl font-bold leading-tight">The Palate</h2>
                <p className="text-lg text-muted-foreground/60">
                  What kind of culinary experiences do you enjoy in Bangalore?
                </p>
              </div>

              <Card className="space-y-10">
                <form.Field name="cuisines">
                  {(field) => (
                    <div className="space-y-4">
                      <Label>Favorite Cuisines</Label>
                      <div className="flex flex-wrap gap-2">
                        {CUISINES.map((c) => (
                          <motion.button
                            key={c}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const current = field.state.value;
                              field.handleChange(
                                current.includes(c)
                                  ? current.filter((i) => i !== c)
                                  : [...current, c],
                              );
                            }}
                            className={`rounded-full border px-6 py-3 text-sm font-bold transition-all ${
                              field.state.value.includes(c)
                                ? "border-red-500/50 bg-[#8b1a1a] text-primary-foreground shadow-[0_0_25px_rgba(139,26,26,0.6),inset_0_0_10px_rgba(255,255,255,0.1)]"
                                : "border-white/20 bg-white/[0.03] text-muted-foreground/80 hover:border-white/40 hover:bg-white/[0.06]"
                            }`}
                          >
                            {c}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </form.Field>

                <form.Field name="preferredAreas">
                  {(field) => (
                    <div className="space-y-4">
                      <Label>Favorite Areas</Label>
                      <div className="flex flex-wrap gap-2">
                        {AREAS.map((a) => (
                          <motion.button
                            key={a}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const current = field.state.value;
                              field.handleChange(
                                current.includes(a)
                                  ? current.filter((i) => i !== a)
                                  : [...current, a],
                              );
                            }}
                            className={`rounded-full border px-6 py-3 text-sm font-bold transition-all ${
                              field.state.value.includes(a)
                                ? "border-yellow-500/50 bg-[#d4af37] text-accent-foreground shadow-[0_0_25px_rgba(212,175,55,0.5),inset_0_0_10px_rgba(255,255,255,0.2)]"
                                : "border-white/20 bg-white/[0.03] text-muted-foreground/80 hover:border-white/40 hover:bg-white/[0.06]"
                            }`}
                          >
                            {a}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </form.Field>
              </Card>

              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 py-5 font-bold transition-all hover:bg-white/5"
                >
                  <ArrowLeft className="h-5 w-5" /> Back
                </button>
                <form.Subscribe selector={(state) => state.values.cuisines}>
                  {(cuisines) => (
                    <button
                      onClick={nextStep}
                      disabled={cuisines.length === 0}
                      className="flex-[2] flex items-center justify-center gap-2 rounded-full bg-primary py-5 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-30"
                    >
                      Next: Final Touch <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </form.Subscribe>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              custom={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="space-y-3">
                <h2 className="font-serif text-4xl font-bold leading-tight">Final Touch</h2>
                <p className="text-lg text-muted-foreground/60">
                  Help potential dining partners get to know the person behind the title.
                </p>
              </div>

              <Card>
                <form.Field name="bio">
                  {(field) => (
                    <div className="space-y-4">
                      <Label>About You</Label>
                      <textarea
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/30"
                        placeholder="I'm a foodie who loves talking about product design and the best craft beers in Bangalore..."
                      />
                      {field.state.meta.errors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-sm font-medium text-red-400/90"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                          {field.state.meta.errors[0]?.toString().includes("[object Object]")
                            ? (field.state.meta.errors[0] as { message?: string }).message
                            : field.state.meta.errors[0]?.toString()}
                        </motion.div>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground/40">
                        <span>Min 10 characters</span>
                        <span>{field.state.value.length} characters</span>
                      </div>
                    </div>
                  )}
                </form.Field>
              </Card>

              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 py-5 font-bold transition-all hover:bg-white/5"
                >
                  <ArrowLeft className="h-5 w-5" /> Back
                </button>
                <form.Subscribe selector={(state) => state.values.bio}>
                  {(bio) => (
                    <button
                      type="submit"
                      disabled={mutation.isPending || !bio}
                      className="flex-[2] flex items-center justify-center gap-2 rounded-full bg-primary py-5 text-lg font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                    >
                      {mutation.isPending ? (
                        <>
                          Completing... <Loader2 className="h-5 w-5 animate-spin" />
                        </>
                      ) : (
                        <>
                          Complete Profile <Sparkles className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  )}
                </form.Subscribe>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
