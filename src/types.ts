export type ArtistTag = "local" | "small" | "favorite";

export interface ArtistMember {
  name: string;
  role?: string;
  musicbrainzId?: string;
}

/** Curated allowlist entry. If they are not here, they are not on the site. */
export interface Artist {
  id: string;
  name: string;
  /** MusicBrainz artist MBID — birthdays + future release-groups. */
  musicbrainzId?: string;
  /** setlist.fm artist MBID (often the same as MusicBrainz). */
  setlistFmMbid?: string;
  /** Ticketmaster Discovery attraction id (optional; name lookup is the fallback). */
  ticketmasterId?: string;
  notes?: string;
  tags?: ArtistTag[];
  members?: ArtistMember[];
  /**
   * Local birthday or founding date (YYYY-MM-DD or YYYY-MM).
   * Used as a fallback so the UI works without hitting MusicBrainz.
   */
  beginDate?: string;
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

export interface SongOfTheDay {
  date: string;
  title: string;
  artistId: string;
  youtubeVideoId: string;
  note?: string;
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
  artistId: string;
  name: string;
  beginDate: string;
  source: "catalog" | "musicbrainz";
}

export interface AttendedResponse {
  configured: boolean;
  message?: string;
  shows: Show[];
}

export interface BirthdaysResponse {
  birthdays: BirthdayEntry[];
  fetchedAt?: string;
  note?: string;
}

export interface UpcomingResponse {
  configured: boolean;
  message?: string;
  shows: Show[];
}
