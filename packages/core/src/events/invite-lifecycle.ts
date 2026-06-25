import type { DiningEvent, EventMember } from "../types";

export type BookingMemberStatus = EventMember["status"];

export interface InviteLifecycleState {
  readonly event: DiningEvent;
  readonly members: readonly (Omit<EventMember, "status"> & { readonly status: BookingMemberStatus })[];
}

export type InviteLifecycleStage = "awaiting_acceptance" | "awaiting_booking_confirmation" | "dineout_ready" | "declined";

export function getInviteLifecycleStage(state: InviteLifecycleState): InviteLifecycleStage {
  if (state.members.some((member) => member.status === "declined")) return "declined";
  if (state.members.every((member) => member.status === "booking_confirmed")) return "dineout_ready";
  if (state.members.every((member) => member.status === "accepted" || member.status === "booking_confirmed")) {
    return "awaiting_booking_confirmation";
  }
  return "awaiting_acceptance";
}

export function canTriggerDineout(state: InviteLifecycleState): boolean {
  return getInviteLifecycleStage(state) === "dineout_ready";
}

export function assertCanConfirmBooking(state: InviteLifecycleState, profileId: string): void {
  const member = state.members.find((candidate) => candidate.profileId === profileId);
  if (!member) throw new Error(`Profile ${profileId} is not a member of event ${state.event.id}`);
  if (member.status === "invited") {
    throw new Error("Invite must be accepted before booking confirmation");
  }
  if (member.status === "declined") {
    throw new Error("Declined invites cannot confirm booking");
  }
}
