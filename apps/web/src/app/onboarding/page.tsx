import { currentUser } from "@clerk/nextjs/server";
import ClientOnboarding from "./client-onboarding";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) return null;

  return <ClientOnboarding userId={user.id} userName={user.firstName || "Diner"} />;
}
