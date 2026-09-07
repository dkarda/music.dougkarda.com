import type { Release } from "../types";

/**
 * Handwritten releases for small bands (and anything MusicBrainz will miss).
 * Catalog artists with a musicbrainzId are filled from MusicBrainz via /api/releases
 * (albums and EPs only — singles are skipped).
 */
export const manualReleases: Release[] = [
  {
    id: "kai-hansen-born-with-a-hammer",
    artistId: "kai-hansen",
    title: "Born With A Hammer",
    date: "2026-09-18",
    type: "Album",
    source: "manual",
    notes: "",
  },
];
