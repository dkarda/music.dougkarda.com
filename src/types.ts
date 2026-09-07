export type ArtistTag = "local" | "small" | "favorite";
export type ArtistKind = "person" | "group";

export interface Person {
  id: string;
  name: string;
  /** Default role used when this person is listed as a solo artist. */
  primaryRole?: string;
  musicbrainzId?: string;
  /** Birthday (YYYY-MM-DD or YYYY-MM). */
  birthDate?: string;
}

export interface ArtistMembership {
  personId: string;
  /** Roles are membership-specific because they may differ by band. */
  role?: string;
}

/** Curated allowlist entry. If they are not here, they are not on the site. */
export interface Artist {
  id: string;
  name: string;
  /** Person vs band/project. Person artists resolve through personId. */
  kind?: ArtistKind;
  personId?: string;
  /** Ticketmaster Discovery attraction id (K8vZ…). Skips name search. */
  ticketmasterId?: string;
  /** MusicBrainz artist MBID for groups; person artists resolve through personId. */
  musicbrainzId?: string;
  /** setlist.fm artist MBID (often the same as MusicBrainz). */
  setlistFmMbid?: string;
  notes?: string;
  tags?: ArtistTag[];
  members?: ArtistMembership[];
  /** Founding year for groups. Person birthdays live in the people catalog. */
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

export interface BirthdayAffiliation {
  artistId: string;
  bandName: string;
  role?: string;
}

export interface BirthdayEntry {
  id: string;
  personId: string;
  name: string;
  birthDate: string;
  source: "catalog" | "musicbrainz";
  affiliations: BirthdayAffiliation[];
  /** Unique roles aggregated from solo and band memberships. */
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
