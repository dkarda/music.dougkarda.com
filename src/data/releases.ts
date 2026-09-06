import type { Release } from "../types";

/**
 * Manual upcoming releases for small bands (and anything MusicBrainz will miss).
 * Long-term, MusicBrainz release-groups for catalog artists can fill this in
 * through a server proxy — same pattern as setlist.fm. Google Calendar is not
 * the source of truth.
 */
export const manualReleases: Release[] = [
  {
    id: "kai-hansen-born-with-a-hammer",
    artistId: "kai-hansen",
    title: "Born With A Hammer",
    date: "2026-09-18",
    type: "LP",
    source: "manual",
    notes: "Placeholder local release — add real titles here as you hear about them.",
  },
];
