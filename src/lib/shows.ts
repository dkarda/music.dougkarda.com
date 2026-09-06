import { isUpcoming } from "./dates";
import type { Show } from "../types";

function showKey(show: Show): string {
  return `${show.date}|${show.artistName.trim().toLowerCase()}`;
}

/** Past handwritten dates, joined onto setlist.fm rows when the same night already exists. */
export function mergePastManualShows(setlistShows: Show[], manuals: Show[]): Show[] {
  const pastManual = manuals.filter((show) => !isUpcoming(show.date));
  const byKey = new Map<string, Show>();

  for (const show of setlistShows) {
    byKey.set(showKey(show), show);
  }

  for (const manual of pastManual) {
    const key = showKey(manual);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, {
        ...existing,
        artistId: manual.artistId ?? existing.artistId,
        notes: manual.notes ?? existing.notes,
        city: manual.city ?? existing.city,
        venue: existing.venue || manual.venue,
      });
    } else {
      byKey.set(key, manual);
    }
  }

  return [...byKey.values()];
}
