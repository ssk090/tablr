import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  professionalTitle: z.string().min(2, "Title must be at least 2 characters"),
  company: z.string().min(2, "Company name is required"),
  cuisines: z.array(z.string()).min(1, "Pick at least one cuisine"),
  preferredAreas: z.array(z.string()).min(1, "Pick at least one area"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
