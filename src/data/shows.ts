import type { Show } from "../types";

/**
 * Handwritten live shows — especially local / small bands APIs will miss.
 * Upcoming dates appear on /upcoming (and merge with Ticketmaster for catalog
 * artists). Once a date is in the past, it joins the setlist.fm list on /attended.
 * the setlist.fm list on /attended (matched by date + artist name).
 */
export const manualShows: Show[] = [
  {
    id: "zepparella-2026-08-08",
    artistId: "zepparella",
    artistName: "Zepparella",
    date: "2026-08-08",
    venue: "Stepping Stone Park",
    city: "Great Neck",
    source: "manual",
    notes: "Clem got me and Petey O into the free town only event.",
  },
  {
    id: "larson-2026-07-31",
    artistId: "travis-larson",
    artistName: "Travis Larson",
    date: "2026-07-31",
    venue: "Mr. Beery's Pub",
    city: "Bethpage",
    source: "manual",
    notes: "Local one off show with Ad Astra opening up.",
  },
  {
    id: "ad-astra-2026-07-31",
    artistId: "ad-astra",
    artistName: "Ad Astra",
    date: "2026-07-31",
    venue: "Mr. Beery's Pub",
    city: "Bethpage",
    source: "manual",
    notes: "Local one off show with Travis Larson headlining.",
  },
  {
    id: "randy-jackson-2026-09-10",
    artistId: "randy-jackson",
    artistName: "Randy Jackson",
    date: "2026-09-10",
    venue: "Live on the Porch",
    city: "Smithtown",
    source: "manual",
    notes: "Local Randy Jackson show.",
  },
];
