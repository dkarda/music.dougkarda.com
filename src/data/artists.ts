import type { Artist } from "../types";

/**
 * THIS FILE IS THE ALLOWLIST.
 * The site only cares about people and bands listed here.
 * Add an artist before expecting shows, birthdays, or releases to appear.
 *
 * IDs you may fill in later:
 * - musicbrainzId: https://musicbrainz.org (artist page URL ends with the MBID)
 * - setlistFmMbid: often the same UUID; confirm on the setlist.fm artist page
 * - ticketmasterId: optional Discovery attraction id if name lookup is wrong
 */
export const artists: Artist[] = [
  {
    id: "dream-theater",
    name: "Dream Theater",
    musicbrainzId: "28503ab7-8bf2-4666-a7bd-2644bfc7cb1d",
    setlistFmMbid: "",
    beginDate: "1985-02",
    tags: ["favorite"],
    notes: "Placeholder. Replace or remove once the real list is started.",
    members: [
      { name: "Thom Yorke", role: "vocals" },
      { name: "Jonny Greenwood", role: "guitar" },
    ],
  },
  {
    id: "ac-dc",
    name: "AC/DC",
    musicbrainzId: "66c662b6-6e2f-4930-8610-912e24c63ed1",
    setlistFmMbid: "",
    beginDate: "1950-01",
    tags: ["favorite"],
    notes: "Placeholder. Replace or remove once the real list is started.",
    members: [
      { name: "Brian Johnson", role: "vocals" },
      { name: "Angus Young", role: "guitar" },
      { name: "Malcolm Young", role: "guitar" },
      { name: "Cliff Williams", role: "bass" },
      { name: "Phil Rudd", role: "drums" },
    ],
  },
  {
    id: "antrhax",
    name: "Anthrax",
    musicbrainzId: "b616d6f0-ec1f-4c69-8a79-12a97ece7372",
    setlistFmMbid: "",
    beginDate: "1950-01",
    tags: ["favorite"],
    notes: "Placeholder. Replace or remove once the real list is started.",
    members: [
      { name: "Joey Belladonna", role: "vocals" },
      { name: "Scott Ian", role: "guitar" },
      { name: "Jonathan Donais", role: "guitar" },
      { name: "Frank Bello", role: "bass" },
      { name: "Charlie Benante", role: "drums" },
    ],
  },
  {
    id: "candlebox",
    name: "Candlebox",
    musicbrainzId: "",
    setlistFmMbid: "",
    beginDate: "1950-01",
    notes: "Placeholder. Replace or remove once the real list is started.",
  },
  {
    id: "dana-fuchs",
    name: "Dana Fuchs",
    musicbrainzId: "",
    setlistFmMbid: "",
    beginDate: "1950-01",
    notes: "Placeholder. Replace or remove once the real list is started.",
  },
  {
    id: "deep-purple",
    name: "Deep Purple",
    musicbrainzId: "",
    setlistFmMbid: "",
    beginDate: "1950-01",
    notes: "Placeholder. Replace or remove once the real list is started.",
  },
  {
    id: "iron-maiden",
    name: "Iron Maiden",
    musicbrainzId: "ca891d65-d9b0-4258-89f7-e6ba29d83767",
    setlistFmMbid: "",
    beginDate: "1950-01",
    tags: ["favorite"],
    notes: "Placeholder. Replace or remove once the real list is started.",
  },
  {
    id: "megadeth",
    name: "Megadeth",
    musicbrainzId: "a9044915-8be3-4c7e-b11f-9e2d2ea0a91e",
    setlistFmMbid: "",
    beginDate: "1950-01",
    tags: ["favorite"],
    notes: "Placeholder. Replace or remove once the real list is started.",
  },
  {
    id: "metallica",
    name: "Metallica",
    musicbrainzId: "",
    setlistFmMbid: "",
    beginDate: "1950-01",
    notes: "Placeholder. Replace or remove once the real list is started.",
  },
  {
    id: "slipknot",
    name: "Slipkont",
    beginDate: "1950-01",
    notes:
      "Placeholder. Add musicbrainzId from the MusicBrainz artist page when you want API-backed birthdays/releases. beginDate is enough for the Birthdays grouping.",
  },
  {
    id: "stryper",
    name: "Stryper",
    beginDate: "1950-01",
    notes:
      "Placeholder. Add musicbrainzId from the MusicBrainz artist page when you want API-backed birthdays/releases. beginDate is enough for the Birthdays grouping.",
  },
  {
    id: "zepparella",
    name: "Zepparella",
    tags: ["local", "small"],
    notes:
      "Placeholder local band. No MusicBrainz / setlist.fm IDs — add shows by hand in shows.ts.",
  },
  {
    id: "kai-hansen",
    name: "Kai Hansen",
    musicbrainzId: "73dcbc17-9c8b-435c-a2b2-4c20ce6ccefc",
    tags: ["favorite"],
    notes:
      "Placeholder local band. No MusicBrainz / setlist.fm IDs — add shows by hand in shows.ts.",
  },
  {
    id: "zebra",
    name: "Zebra",
    musicbrainzId: "a8ad585a-2776-4531-a1cc-93b9a3c9d43b",
    setlistFmMbid: "",
    beginDate: "1950-01",
    tags: ["favorite"],
    notes: "Placeholder. Replace or remove once the real list is started.",
    members: [
      { name: "Randy Jackson", role: "vocals" },
      { name: "Felix Hanemann", role: "bass" },
      { name: "Guy Gelso", role: "drums" },
    ],
  },
];

export function getArtistById(id: string): Artist | undefined {
  return artists.find((artist) => artist.id === id);
}

export function catalogMbids(): Set<string> {
  const ids = new Set<string>();
  for (const artist of artists) {
    if (artist.musicbrainzId) ids.add(artist.musicbrainzId.toLowerCase());
    if (artist.setlistFmMbid) ids.add(artist.setlistFmMbid.toLowerCase());
  }
  return ids;
}

export function artistIdForMbid(mbid: string): string | undefined {
  const needle = mbid.toLowerCase();
  return artists.find(
    (artist) =>
      artist.musicbrainzId?.toLowerCase() === needle ||
      artist.setlistFmMbid?.toLowerCase() === needle,
  )?.id;
}
