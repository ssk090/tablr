DELETE FROM dinner_intents a
USING dinner_intents b
WHERE a.status = 'open'
  AND b.status = 'open'
  AND a.profile_id = b.profile_id
  AND a.date = b.date
  AND a.time_slot = b.time_slot
  AND COALESCE(a.preferred_area, '') = COALESCE(b.preferred_area, '')
  AND a.created_at < b.created_at;
