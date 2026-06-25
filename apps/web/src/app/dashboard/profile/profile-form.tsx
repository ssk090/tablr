"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Card, Input, Label } from "@/components/design-system/atoms";
import { SelectableChipField } from "@/components/design-system/selectable-chip-field";
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
        linkedinUrl: "",
        githubUrl: "",
        cuisines: [],
        preferredAreas: [],
        bio: "",
      } as ProfileFormValues),
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
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
          <p className="text-muted-foreground">Refine your professional and culinary profile.</p>
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
        <Card className="space-y-8 border-border/80 bg-secondary/20 p-10 dark:border-white/10 dark:bg-white/[0.01]">
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
                    className="flex items-center gap-2 text-sm font-medium text-destructive"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_color-mix(in_srgb,var(--destructive)_45%,transparent)]" />
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
                      className="flex items-center gap-2 text-sm font-medium text-destructive"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_color-mix(in_srgb,var(--destructive)_45%,transparent)]" />
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
                      className="flex items-center gap-2 text-sm font-medium text-destructive"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_color-mix(in_srgb,var(--destructive)_45%,transparent)]" />
                      {field.state.meta.errors[0]?.toString()}
                    </motion.div>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <form.Field name="linkedinUrl">
              {(field) => (
                <div className="space-y-3">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://www.linkedin.com/in/your-profile"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="githubUrl">
              {(field) => (
                <div className="space-y-3">
                  <Label>GitHub URL</Label>
                  <Input
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://github.com/your-handle"
                  />
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
                  className="w-full rounded-2xl border border-border bg-background/70 p-6 text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5"
                  placeholder="Tell your story..."
                />
                {field.state.meta.errors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm font-medium text-destructive"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px_color-mix(in_srgb,var(--destructive)_45%,transparent)]" />
                    {field.state.meta.errors[0]?.toString()}
                  </motion.div>
                )}
              </div>
            )}
          </form.Field>
        </Card>

        <Card className="space-y-10 border-border/80 bg-secondary/20 p-10 dark:border-white/10 dark:bg-white/[0.01]">
          <form.Field name="cuisines">
            {(field) => (
              <SelectableChipField
                label="Cuisines You Crave"
                options={CUISINES}
                value={field.state.value}
                onChange={field.handleChange}
                customPlaceholder="Add Burmese, Thai, Andhra meals..."
                helperText="Pick from the suggestions or add anything you are currently craving."
              />
            )}
          </form.Field>

          <form.Field name="preferredAreas">
            {(field) => (
              <SelectableChipField
                label="Preferred Neighborhoods"
                options={AREAS}
                value={field.state.value}
                onChange={field.handleChange}
                customPlaceholder="Add Sahakar Nagar, Malleshwaram..."
                helperText="We currently support Bangalore. Add any neighbourhood you would realistically travel to."
                selectedClassName="border-yellow-500/50 bg-[#d4af37] text-accent-foreground shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              />
            )}
          </form.Field>
        </Card>

        {mutation.data?.warning ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-200">
            {mutation.data.warning}
          </div>
        ) : null}

        {mutation.error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Failed to save profile."}
          </div>
        ) : null}

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
