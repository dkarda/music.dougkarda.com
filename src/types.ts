export type ArtistTag = "local" | "small" | "favorite";
export type ArtistKind = "person" | "group";

export interface ArtistMember {
  name: string;
  role?: string;
  musicbrainzId?: string;
  /** Birthday (YYYY-MM-DD or YYYY-MM). */
  birthDate?: string;
}

/** Curated allowlist entry. If they are not here, they are not on the site. */
export interface Artist {
  id: string;
  name: string;
  /** Person vs band/project. Birthdays page only lists people. */
  kind?: ArtistKind;
  /** Ticketmaster Discovery attraction id (K8vZ…). Skips name search. */
  ticketmasterId?: string;
  /** MusicBrainz artist MBID — birthdays and release-groups. */
  musicbrainzId?: string;
  /** setlist.fm artist MBID (often the same as MusicBrainz). */
  setlistFmMbid?: string;
  notes?: string;
  tags?: ArtistTag[];
  members?: ArtistMember[];
  /**
   * Birthday for people (YYYY-MM-DD). Founding year only for groups (YYYY).
   */
  birthDate?: string;
}

export type ShowSource = "manual" | "setlistfm" | "ticketmaster";

export interface Show {
  id: string;
  artistId?: string;
  artistName: string;
  date: string;
  venue: string;
  city?: string;
  source: ShowSource;
  notes?: string;
  url?: string;
}

export type ReleaseSource = "manual" | "musicbrainz";

export interface Release {
  id: string;
  artistId: string;
  title: string;
  date: string;
  type?: string;
  source: ReleaseSource;
  notes?: string;
}

export interface BirthdayEntry {
  id: string;
  artistId: string;
  name: string;
  birthDate: string;
  source: "catalog" | "musicbrainz";
  bandName?: string;
  role?: string;
}

export interface AttendedResponse {
  configured: boolean;
  message?: string;
  shows: Show[];
  /** True while a background setlist.fm refresh is running. */
  refreshing?: boolean;
}

export interface BirthdaysResponse {
  birthdays: BirthdayEntry[];
  fetchedAt?: string;
  note?: string;
  /** True while a background MusicBrainz refresh is running. */
  refreshing?: boolean;
}

export interface UpcomingResponse {
  configured: boolean;
  message?: string;
  shows: Show[];
  /** True while a background Ticketmaster refresh is running. */
  refreshing?: boolean;
}

export interface ReleasesResponse {
  releases: Release[];
  fetchedAt?: string;
  note?: string;
  /** True while a background MusicBrainz refresh is running. */
  refreshing?: boolean;
}
