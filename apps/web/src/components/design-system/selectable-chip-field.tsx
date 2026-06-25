"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { type FormEvent, type ReactElement, useState } from "react";
import { Input, Label, cn } from "./atoms";

function normalizeOption(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function optionKey(value: string): string {
  return normalizeOption(value).toLocaleLowerCase("en-IN");
}

function addUniqueOption(options: readonly string[], option: string): string[] {
  const normalized = normalizeOption(option);
  if (!normalized) return [...options];

  const existingKeys = new Set(options.map(optionKey));
  if (existingKeys.has(optionKey(normalized))) return [...options];

  return [...options, normalized];
}

export interface SelectableChipFieldProps {
  readonly label: string;
  readonly options: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly customPlaceholder: string;
  readonly helperText?: string;
  readonly selectedClassName?: string;
}

export function SelectableChipField({
  label,
  options,
  value,
  onChange,
  customPlaceholder,
  helperText,
  selectedClassName,
}: SelectableChipFieldProps): ReactElement {
  const [customValue, setCustomValue] = useState("");
  const selectedKeys = new Set(value.map(optionKey));
  const visibleOptions = [...options];

  for (const selected of value) {
    if (!visibleOptions.some((option) => optionKey(option) === optionKey(selected))) {
      visibleOptions.push(selected);
    }
  }

  function toggleOption(option: string): void {
    const key = optionKey(option);
    if (selectedKeys.has(key)) {
      onChange(value.filter((item) => optionKey(item) !== key));
      return;
    }

    onChange(addUniqueOption(value, option));
  }

  function addCustomOption(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextValue = addUniqueOption(value, customValue);
    onChange(nextValue);
    setCustomValue("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>{label}</Label>
        {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {visibleOptions.map((option) => {
            const isSelected = selectedKeys.has(optionKey(option));
            return (
              <motion.button
                key={optionKey(option)}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleOption(option)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-bold transition-all",
                  isSelected
                    ? cn(
                        "border-primary/50 bg-primary text-primary-foreground shadow-[0_0_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]",
                        selectedClassName,
                      )
                    : "border-border bg-background/70 text-muted-foreground shadow-sm hover:border-primary/40 hover:bg-secondary/60 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/30",
                )}
              >
                {option}
                {isSelected ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <form onSubmit={addCustomOption} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          placeholder={customPlaceholder}
          className="sm:max-w-sm"
        />
        <button
          type="submit"
          disabled={!normalizeOption(customValue)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/70 px-5 py-3 text-sm font-bold text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/30 dark:hover:bg-white/[0.06]"
        >
          <Plus className="h-4 w-4" /> Add custom
        </button>
      </form>
    </div>
  );
}
