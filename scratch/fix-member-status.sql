ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'booking_confirmed';
UPDATE event_members SET status = 'accepted' WHERE status = 'joined';
