"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { acceptInvite, confirmBooking, getPublicProfile } from "./actions";

export default function MatchProfilePage({ params }: { params: { profileId: string } }) {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? undefined;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["public-profile", params.profileId, eventId],
    queryFn: () => getPublicProfile(params.profileId, eventId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["public-profile", params.profileId, eventId] });
  const accept = useMutation({ mutationFn: () => acceptInvite(eventId ?? ""), onSuccess: refresh });
  const confirm = useMutation({ mutationFn: () => confirmBooking(eventId ?? ""), onSuccess: refresh });

  if (isLoading) return <div className="p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!data) return null;

  const preferences = data.profile.diningPreferences as { cuisines?: string[]; preferredAreas?: string[] };
  const interests = Array.isArray(data.profile.interests) ? data.profile.interests : [];
  const status = data.viewerMembership?.status;

  return (
    <main className="mx-auto max-w-4xl p-6 lg:p-12">
      <div className="rounded-[2.5rem] border border-border/80 bg-secondary/20 p-10 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Match profile</p>
        <h1 className="font-serif text-5xl font-bold">{data.profile.name}</h1>
        <p className="mt-3 text-muted-foreground">
          {[data.profile.professionalTitle, data.profile.company].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-8 text-lg leading-8">{data.profile.bio}</p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Info title="Cuisines" values={preferences.cuisines ?? []} />
          <Info title="Neighborhoods" values={preferences.preferredAreas ?? []} />
          <Info title="Interests" values={interests as string[]} />
          <div className="space-y-3 rounded-3xl border border-border/80 bg-background/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]">
            <h2 className="font-bold">Social links</h2>
            {data.profile.linkedinUrl && <a className="block text-primary" href={data.profile.linkedinUrl}>LinkedIn</a>}
            {data.profile.githubUrl && <a className="block text-primary" href={data.profile.githubUrl}>GitHub</a>}
          </div>
        </div>

        {eventId && (
          <div className="mt-10 flex flex-wrap gap-4">
            {status === "INVITED" && <button className="rounded-full bg-primary px-6 py-3 font-bold" onClick={() => accept.mutate()}>Accept invite</button>}
            {(status === "ACCEPTED" || status === "BOOKING_CONFIRMED") && <button className="rounded-full bg-primary px-6 py-3 font-bold" onClick={() => confirm.mutate()}>Confirm booking</button>}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ title, values }: { title: string; values: string[] }) {
  return <div className="rounded-3xl border border-border/80 bg-background/60 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"><h2 className="mb-3 font-bold">{title}</h2><p className="text-muted-foreground">{values.length ? values.join(", ") : "Not specified"}</p></div>;
}
