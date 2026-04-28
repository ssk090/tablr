"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Card, Input, Label } from "@/components/design-system/atoms";
import { getProfile, saveProfile } from "../../onboarding/actions";
import { type ProfileFormValues, profileSchema } from "../../onboarding/schema";

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

export function ProfileForm({ userId }: { userId: string }) {
  const { data: initialData, isLoading: isFetching } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(),
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ProfileFormValues) => saveProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  const form = useForm({
    defaultValues:
      initialData ||
      ({
        fullName: "",
        professionalTitle: "",
        company: "",
        cuisines: [],
        preferredAreas: [],
        bio: "",
      } as ProfileFormValues),
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value, {
        onSuccess: () => {
          form.reset();
        },
      });
    },
  });

  if (isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-4xl font-bold">Your Identity</h1>
          <p className="text-muted-foreground/60">Refine your professional and culinary profile.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-8"
      >
        <Card className="space-y-8 border-white/5 bg-white/[0.01] p-10">
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
                    {field.state.meta.errors[0]?.toString()}
                  </motion.div>
                )}
              </div>
            )}
          </form.Field>

          <div className="grid gap-8 md:grid-cols-2">
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
                      {field.state.meta.errors[0]?.toString()}
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
                    placeholder="e.g. Google, Zerodha..."
                  />
                  {field.state.meta.errors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-sm font-medium text-red-400/90"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                      {field.state.meta.errors[0]?.toString()}
                    </motion.div>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="bio">
            {(field) => (
              <div className="space-y-3">
                <Label>About You</Label>
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Tell your story..."
                />
                {field.state.meta.errors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm font-medium text-red-400/90"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
                    {field.state.meta.errors[0]?.toString()}
                  </motion.div>
                )}
              </div>
            )}
          </form.Field>
        </Card>

        <Card className="space-y-10 border-white/5 bg-white/[0.01] p-10">
          <form.Field name="cuisines">
            {(field) => (
              <div className="space-y-6">
                <Label>Cuisines You Crave</Label>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => {
                    const isSelected = field.state.value.includes(c);
                    return (
                      <motion.button
                        key={c}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const current = field.state.value;
                          field.handleChange(
                            current.includes(c) ? current.filter((i) => i !== c) : [...current, c],
                          );
                        }}
                        className={`rounded-full border px-6 py-2.5 text-sm font-bold transition-all ${
                          isSelected
                            ? "border-red-500/50 bg-[#8b1a1a] text-primary-foreground shadow-[0_0_20px_rgba(139,26,26,0.4)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground/60 hover:border-white/30"
                        }`}
                      >
                        {c}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="preferredAreas">
            {(field) => (
              <div className="space-y-6">
                <Label>Preferred Neighborhoods</Label>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((a) => {
                    const isSelected = field.state.value.includes(a);
                    return (
                      <motion.button
                        key={a}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const current = field.state.value;
                          field.handleChange(
                            current.includes(a) ? current.filter((i) => i !== a) : [...current, a],
                          );
                        }}
                        className={`rounded-full border px-6 py-2.5 text-sm font-bold transition-all ${
                          isSelected
                            ? "border-yellow-500/50 bg-[#d4af37] text-accent-foreground shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                            : "border-white/10 bg-white/[0.02] text-muted-foreground/60 hover:border-white/30"
                        }`}
                      >
                        {a}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </form.Field>
        </Card>

        <div className="flex justify-end pt-4">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isDirty]}>
            {([canSubmit, isDirty]) => (
              <button
                type="submit"
                disabled={!canSubmit || !isDirty || mutation.isPending}
                className="flex items-center gap-2 rounded-full bg-primary px-10 py-4 font-bold text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
              >
                {mutation.isPending ? (
                  <>
                    Saving Changes... <Loader2 className="h-5 w-5 animate-spin" />
                  </>
                ) : mutation.isSuccess && !isDirty ? (
                  <>
                    Changes Saved! <Check className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Save Profile <Sparkles className="h-5 w-5" />
                  </>
                )}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
