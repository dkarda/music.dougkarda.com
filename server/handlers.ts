import { artists, artistIdForMbid, artistMusicbrainzId } from "../src/data/artists";
import { manualReleases } from "../src/data/releases";
import { catalogBirthdayCandidates, catalogBirthdays } from "../src/lib/birthdays";
import type {
  Artist,
  AttendedResponse,
  BirthdayAffiliation,
  BirthdayEntry,
  BirthdaysResponse,
  Show,
  UpcomingResponse,
  Release,
  ReleasesResponse,
} from "../src/types";
import { isUpcoming, inReleaseWindow, yearStartIso } from "../src/lib/dates";
import { isNyMetroCoords, NY_METRO_CENTER, NY_METRO_RADIUS_MILES } from "../src/lib/geo";
import { readJsonCache, writeJsonCache } from "./disk-cache";
import type { IncomingMessage, ServerResponse } from "node:http";

const SETLIST_BASE = "https://api.setlist.fm/rest/1.0";
const MB_BASE = "https://musicbrainz.org/ws/2";
const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

type Env = Record<string, string>;

const BIRTHDAY_TTL_MS = 24 * 60 * 60 * 1000;
const BIRTHDAYS_DUMP_FILE = "musicbrainz-birthdays.json";

const ATTENDED_TTL_MS = 24 * 60 * 60 * 1000;
const ATTENDED_DUMP_FILE = "setlistfm-attended.json";

const UPCOMING_TTL_MS = 24 * 60 * 60 * 1000;
const TM_DUMP_FILE = "ticketmaster-ny-events.json";
const RELEASES_TTL_MS = 24 * 60 * 60 * 1000;
const RELEASES_DUMP_FILE = "musicbrainz-release-groups.json";
const MB_RELEASE_GAP_MS = 1100;
const MB_SEARCH_BATCH = 25;
const MB_RG_PAGE_SIZE = 100;
const MB_RG_MAX_PAGES = 5;
const MB_DATE_RANGE_END = "2099-12-31";
const SKIP_RG_SECONDARY = new Set([
  "Compilation",
  "DJ-mix",
  "Interview",
  "Audiobook",
  "Spokenword",
  "Remix",
]);
const TM_GAP_MS = 250;
const SETLIST_PAGE_GAP_MS = 750;
const SETLIST_MAX_PAGES = 50;

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function setlistDateToIso(eventDate: string): string {
  const [day, month, year] = eventDate.split("-");
  if (!year || !month || !day) return eventDate;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

type SetlistFmSetlist = {
  id?: string;
  eventDate?: string;
  url?: string;
  artist?: { mbid?: string; name?: string };
  venue?: { name?: string; city?: { name?: string; state?: string } };
};

type SetlistFmAttendedPage = {
  setlist?: SetlistFmSetlist[];
  total?: number;
  itemsPerPage?: number;
  page?: number;
};

function mapSetlist(setlist: SetlistFmSetlist): Show {
  const mbid = setlist.artist?.mbid?.toLowerCase();
  const city = [setlist.venue?.city?.name, setlist.venue?.city?.state]
    .filter(Boolean)
    .join(", ");

  return {
    id: setlist.id ?? `${mbid ?? "unknown"}-${setlist.eventDate}`,
    artistId: mbid ? artistIdForMbid(mbid) : undefined,
    artistName: setlist.artist?.name ?? "Unknown artist",
    date: setlist.eventDate ? setlistDateToIso(setlist.eventDate) : "",
    venue: setlist.venue?.name ?? "Unknown venue",
    city: city || undefined,
    source: "setlistfm",
    url: setlist.url,
  };
}

async function fetchAttendedPage(
  apiKey: string,
  userId: string,
  page: number,
): Promise<{ ok: true; data: SetlistFmAttendedPage } | { ok: false; status: number; text: string }> {
  const url = `${SETLIST_BASE}/user/${encodeURIComponent(userId)}/attended?p=${page}`;
  let lastFailure = { ok: false as const, status: 0, text: "Request failed" };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        const data = (await response.json()) as SetlistFmAttendedPage;
        return { ok: true, data };
      }
      lastFailure = {
        ok: false,
        status: response.status,
        text: await response.text(),
      };
      if (response.status !== 429 && response.status < 500) return lastFailure;
    } catch (error) {
      lastFailure = {
        ok: false,
        status: 0,
        text: error instanceof Error ? error.message : "Request failed",
      };
    }
    if (attempt < 3) await sleep(attempt * 1_500);
  }
  return lastFailure;
}

type AttendedDump = {
  at: number;
  shows: Show[];
  total?: number;
};

let attendedDumpMemory: AttendedDump | undefined;
let attendedRefresh: Promise<void> | null = null;
let attendedRefreshCooldownUntil = 0;

function emptyAttendedDump(): AttendedDump {
  return { at: 0, shows: [] };
}

function attendedDumpIsFresh(dump: AttendedDump): boolean {
  const complete = dump.total == null || dump.shows.length >= dump.total;
  return complete && dump.at > 0 && Date.now() - dump.at < ATTENDED_TTL_MS;
}

async function loadAttendedDump(): Promise<AttendedDump> {
  if (attendedDumpMemory) return attendedDumpMemory;
  const disk = await readJsonCache<AttendedDump>(ATTENDED_DUMP_FILE);
  if (disk && Array.isArray(disk.shows) && typeof disk.at === "number") {
    attendedDumpMemory = disk;
    return disk;
  }
  const empty = emptyAttendedDump();
  attendedDumpMemory = empty;
  return empty;
}

async function saveAttendedDump(dump: AttendedDump): Promise<void> {
  attendedDumpMemory = dump;
  await writeJsonCache(ATTENDED_DUMP_FILE, dump);
}

function attendedMessage(shows: Show[], total?: number, refreshing?: boolean): string {
  let message =
    shows.length === 0
      ? "Connected. No attended setlists on this setlist.fm user yet."
      : total != null && total > shows.length
        ? `Connected. Showing ${shows.length} of ${total} attended shows (page cap).`
        : `Connected. ${shows.length} attended show${shows.length === 1 ? "" : "s"} from setlist.fm.`;
  if (refreshing) {
    message += shows.length ? " Updating in the background." : " Filling in the background.";
  } else if (shows.length > 0) {
    message += " Cached 24h.";
  }
  return message;
}

async function refreshAttendedDump(env: Env): Promise<void> {
  const apiKey = env.SETLISTFM_API_KEY?.trim();
  const userId = env.SETLISTFM_USER_ID?.trim();
  if (!apiKey || !userId) return;

  const first = await fetchAttendedPage(apiKey, userId, 1);
  if (!first.ok) {
    attendedRefreshCooldownUntil = Date.now() + 60_000;
    return;
  }

  const shows: Show[] = (first.data.setlist ?? []).map(mapSetlist);
  const total = first.data.total ?? shows.length;
  const perPage = first.data.itemsPerPage || 20;
  const pageCount = Math.min(SETLIST_MAX_PAGES, Math.max(1, Math.ceil(total / perPage)));

  for (let page = 2; page <= pageCount; page += 1) {
    await sleep(SETLIST_PAGE_GAP_MS);
    const next = await fetchAttendedPage(apiKey, userId, page);
    if (!next.ok) {
      attendedRefreshCooldownUntil = Date.now() + 60_000;
      return;
    }
    shows.push(...(next.data.setlist ?? []).map(mapSetlist));
  }

  await saveAttendedDump({
    at: Date.now(),
    shows: shows.slice().sort((a, b) => b.date.localeCompare(a.date)),
    total,
  });
}

function scheduleAttendedRefresh(env: Env): void {
  if (attendedRefresh) return;
  if (Date.now() < attendedRefreshCooldownUntil) return;
  attendedRefresh = refreshAttendedDump(env)
    .catch(() => undefined)
    .finally(() => {
      attendedRefresh = null;
    });
}

export async function handleAttended(env: Env): Promise<{ status: number; body: AttendedResponse }> {
  const apiKey = env.SETLISTFM_API_KEY?.trim();
  const userId = env.SETLISTFM_USER_ID?.trim();

  if (!apiKey || !userId) {
    return {
      status: 200,
      body: {
        configured: false,
        message:
          "setlist.fm is not configured. Copy .env.example to .env and add SETLISTFM_API_KEY and SETLISTFM_USER_ID. The key stays on the server — never in the frontend.",
        shows: [],
      },
    };
  }

  const dump = await loadAttendedDump();
  const stale = !attendedDumpIsFresh(dump);
  if (stale) scheduleAttendedRefresh(env);
  const refreshing = Boolean(attendedRefresh);

  return {
    status: 200,
    body: {
      configured: true,
      message: attendedMessage(dump.shows, dump.total, refreshing),
      shows: dump.shows,
      refreshing,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type MbArtist = { id?: string; name?: string; "life-span"?: { begin?: string } };

type BirthdayGap = {
  id: string;
  personId: string;
  name: string;
  mbid: string;
  affiliations: BirthdayAffiliation[];
  role?: string;
};

type BirthdayDumpEntry = { birthDate?: string; at: number };

type BirthdaysDump = {
  at: number;
  byId: Record<string, BirthdayDumpEntry>;
};

let birthdaysDumpMemory: BirthdaysDump | undefined;
let birthdaysRefresh: Promise<void> | null = null;
let birthdaysRefreshCooldownUntil = 0;

function emptyBirthdaysDump(): BirthdaysDump {
  return { at: 0, byId: {} };
}

function birthdayGaps(): BirthdayGap[] {
  return catalogBirthdayCandidates()
    .filter((candidate) =>
      !candidate.person.birthDate?.trim() &&
      Boolean(candidate.person.musicbrainzId?.trim()),
    )
    .map((candidate) => ({
      id: candidate.person.id,
      personId: candidate.person.id,
      name: candidate.person.name,
      mbid: candidate.person.musicbrainzId!.trim().toLowerCase(),
      affiliations: candidate.affiliations,
      role: candidate.role,
    }));
}

function extrasFromDump(dump: BirthdaysDump): BirthdayEntry[] {
  const gaps = new Map(birthdayGaps().map((gap) => [gap.id, gap]));
  const extras: BirthdayEntry[] = [];
  for (const [id, entry] of Object.entries(dump.byId)) {
    if (!entry.birthDate) continue;
    const gap = gaps.get(id);
    if (!gap) continue;
    extras.push({
      id,
      personId: gap.personId,
      name: gap.name,
      birthDate: entry.birthDate,
      source: "musicbrainz",
      affiliations: gap.affiliations,
      role: gap.role,
    });
  }
  return extras;
}

function mergeBirthdayExtras(extras: BirthdayEntry[]): BirthdayEntry[] {
  const catalog = catalogBirthdays();
  const seen = new Set(catalog.map((entry) => entry.id));
  const out = [...catalog];
  for (const extra of extras) {
    if (!extra.birthDate || seen.has(extra.id)) continue;
    out.push(extra);
    seen.add(extra.id);
  }
  return out;
}

function birthdaysDumpIsFresh(dump: BirthdaysDump): boolean {
  if (!(dump.at > 0 && Date.now() - dump.at < BIRTHDAY_TTL_MS)) return false;
  return birthdayGaps().every((gap) => Boolean(dump.byId[gap.id]));
}

async function loadBirthdaysDump(): Promise<BirthdaysDump> {
  if (birthdaysDumpMemory) return birthdaysDumpMemory;
  const disk = await readJsonCache<BirthdaysDump>(BIRTHDAYS_DUMP_FILE);
  if (disk?.byId && typeof disk.byId === "object" && typeof disk.at === "number") {
    birthdaysDumpMemory = disk;
    return disk;
  }
  const empty = emptyBirthdaysDump();
  birthdaysDumpMemory = empty;
  return empty;
}

async function saveBirthdaysDump(dump: BirthdaysDump): Promise<void> {
  birthdaysDumpMemory = dump;
  await writeJsonCache(BIRTHDAYS_DUMP_FILE, dump);
}

async function fetchMbBeginDate(mbid: string, userAgent: string): Promise<string | undefined> {
  const url = `${MB_BASE}/artist/${encodeURIComponent(mbid)}?fmt=json`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 429) throw new Error("MusicBrainz 429");
  if (!response.ok) return undefined;
  const data = (await response.json()) as MbArtist;
  return data["life-span"]?.begin;
}

async function refreshBirthdaysDump(env: Env): Promise<void> {
  const userAgent =
    env.MUSICBRAINZ_USER_AGENT?.trim() ||
    "music.dougkarda.com/0.1 (https://music.dougkarda.com)";
  const dump = await loadBirthdaysDump();
  const gaps = birthdayGaps();
  let failed = 0;
  let started = false;

  for (const gap of gaps) {
    const existing = dump.byId[gap.id];
    if (existing && Date.now() - existing.at < BIRTHDAY_TTL_MS) continue;
    if (started) await sleep(MB_RELEASE_GAP_MS);
    started = true;
    try {
      const begin = await fetchMbBeginDate(gap.mbid, userAgent);
      dump.byId[gap.id] = { at: Date.now(), birthDate: begin };
    } catch {
      failed += 1;
    }
  }

  if (failed > 0) birthdaysRefreshCooldownUntil = Date.now() + 60_000;

  await saveBirthdaysDump({
    at: failed > 0 ? dump.at : Date.now(),
    byId: dump.byId,
  });
}

function scheduleBirthdaysRefresh(env: Env): void {
  if (birthdaysRefresh) return;
  if (Date.now() < birthdaysRefreshCooldownUntil) return;
  birthdaysRefresh = refreshBirthdaysDump(env)
    .catch(() => undefined)
    .finally(() => {
      birthdaysRefresh = null;
    });
}

export async function handleBirthdays(env: Env): Promise<{ status: number; body: BirthdaysResponse }> {
  const dump = await loadBirthdaysDump();
  const stale = !birthdaysDumpIsFresh(dump);
  if (stale) scheduleBirthdaysRefresh(env);
  const refreshing = Boolean(birthdaysRefresh);

  const birthdays = mergeBirthdayExtras(extrasFromDump(dump));
  const catalogCount = catalogBirthdays().length;
  const extraCount = birthdays.length - catalogCount;
  let note = `Catalog: ${catalogCount} people.`;
  if (extraCount > 0) note += ` MusicBrainz filled ${extraCount} missing date(s).`;
  if (refreshing) {
    note += " Updating in the background.";
  } else {
    note += " Cached 24h.";
  }

  return {
    status: 200,
    body: {
      birthdays,
      fetchedAt: new Date().toISOString(),
      note,
      refreshing,
    },
  };
}

type TmAttraction = { id?: string; name?: string };
type TmVenue = {
  name?: string;
  city?: { name?: string };
  state?: { stateCode?: string; name?: string };
  location?: { latitude?: string; longitude?: string };
};
type TmEvent = {
  id?: string;
  url?: string;
  dates?: { start?: { localDate?: string } };
  _embedded?: { venues?: TmVenue[]; attractions?: TmAttraction[] };
};

type TmDump = { at: number; events: TmEvent[] };
let tmDumpMemory: TmDump | undefined;
let tmRefresh: Promise<void> | null = null;
let tmRefreshCooldownUntil = 0;
let tmLastExtra: string | undefined;

function foldName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/^the\b/, "")
    .replace(/[^a-z0-9]/g, "");
}

function namesAlign(catalog: string, remote: string): boolean {
  const a = foldName(catalog);
  const b = foldName(remote);
  if (!a || !b) return false;
  return a === b;
}

function usesTicketmaster(artist: Artist): boolean {
  if (artist.ticketmasterId?.trim()) return true;
  const tags = artist.tags ?? [];
  if (tags.includes("local") || tags.includes("small")) return false;
  return Boolean(artist.name.trim());
}

type TmEventsPage = {
  _embedded?: { events?: TmEvent[] };
  page?: { number?: number; totalPages?: number };
};

async function fetchTmJson<T>(url: string): Promise<{ status: number; data: T; headers: Headers }> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await response.json()) as T;
  return { status: response.status, data, headers: response.headers };
}

function catalogArtistsForEvent(event: TmEvent, catalog: Artist[]): Artist[] {
  const attractions = event._embedded?.attractions ?? [];
  const matched: Artist[] = [];
  const seen = new Set<string>();

  for (const artist of catalog) {
    const tmId = artist.ticketmasterId?.trim();
    const hit = attractions.some((attraction) => {
      if (tmId && attraction.id === tmId) return true;
      return Boolean(attraction.name && namesAlign(artist.name, attraction.name));
    });
    if (hit && !seen.has(artist.id)) {
      seen.add(artist.id);
      matched.push(artist);
    }
  }

  return matched;
}

function isNyMetroVenue(venue: TmVenue | undefined): boolean {
  if (!venue) return false;
  const lat = Number(venue.location?.latitude);
  const lon = Number(venue.location?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return isNyMetroCoords(lat, lon);
  }
  const state = venue.state?.stateCode?.toUpperCase();
  const city = (venue.city?.name ?? "").toLowerCase();
  if (state === "NY") {
    return /new york|brooklyn|queens|bronx|staten|yonkers|white plains|hempstead|uniondale|westbury|wantagh|huntington|smithtown|elmont|flushing|garden city|great neck|bethpage|uniondale/.test(
      city,
    );
  }
  if (state === "NJ") {
    return /east rutherford|rutherford|newark|jersey city|hoboken|secaucus|meadowlands/.test(city);
  }
  return false;
}

function mapTmEvent(event: TmEvent, artist: Artist): Show | undefined {
  const date = event.dates?.start?.localDate;
  if (!date || !isUpcoming(date)) return undefined;
  const venue = event._embedded?.venues?.[0];
  if (!isNyMetroVenue(venue)) return undefined;
  const city = [venue?.city?.name, venue?.state?.stateCode ?? venue?.state?.name]
    .filter(Boolean)
    .join(", ");

  return {
    id: event.id ? `tm-${event.id}-${artist.id}` : `tm-${artist.id}-${date}`,
    artistId: artist.id,
    artistName: artist.name,
    date,
    venue: venue?.name ?? "Unknown venue",
    city: city || undefined,
    source: "ticketmaster",
    url: event.url,
  };
}

async function fetchNyMetroEvents(
  apiKey: string,
): Promise<{ events: TmEvent[]; rateLimited: boolean; failed: boolean; quotaResetAt?: number }> {
  const events: TmEvent[] = [];
  const geo = `${NY_METRO_CENTER.lat},${NY_METRO_CENTER.lon}`;
  const maxPages = 5;

  for (let page = 0; page < maxPages; page += 1) {
    if (page > 0) await sleep(TM_GAP_MS);
    const params = new URLSearchParams({
      geoPoint: geo,
      radius: String(NY_METRO_RADIUS_MILES),
      unit: "miles",
      classificationName: "music",
      size: "200",
      page: String(page),
      sort: "date,asc",
      apikey: apiKey,
    });
    const { status, data, headers } = await fetchTmJson<TmEventsPage>(`${TM_BASE}/events.json?${params.toString()}`);
    if (status === 429) {
      const quotaResetAt = Number(headers.get("rate-limit-reset"));
      return {
        events,
        rateLimited: true,
        failed: true,
        quotaResetAt: Number.isFinite(quotaResetAt) ? quotaResetAt : undefined,
      };
    }
    if (status < 200 || status >= 300) return { events, rateLimited: false, failed: true };
    events.push(...(data._embedded?.events ?? []));
    const totalPages = data.page?.totalPages ?? 1;
    if (page + 1 >= totalPages) break;
  }

  return { events, rateLimited: false, failed: false };
}

async function loadTmDump(): Promise<TmDump | undefined> {
  if (tmDumpMemory?.events) return tmDumpMemory;
  const disk = await readJsonCache<TmDump>(TM_DUMP_FILE);
  if (!disk || !Array.isArray(disk.events) || typeof disk.at !== "number") return undefined;
  tmDumpMemory = disk;
  return disk;
}

async function saveTmDump(dump: TmDump): Promise<void> {
  tmDumpMemory = dump;
  await writeJsonCache(TM_DUMP_FILE, dump);
}

function dumpIsFresh(dump: TmDump): boolean {
  return Date.now() - dump.at < UPCOMING_TTL_MS;
}

function cacheStamp(at: number): string {
  return new Date(at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function quotaResetLabel(quotaResetAt?: number): string | undefined {
  if (!quotaResetAt || quotaResetAt <= Date.now()) return undefined;
  return cacheStamp(quotaResetAt);
}

function showsFromTmEvents(events: TmEvent[]): Show[] {
  const catalog = artists.filter(usesTicketmaster);
  const shows: Show[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    for (const artist of catalogArtistsForEvent(event, catalog)) {
      const show = mapTmEvent(event, artist);
      if (!show || seen.has(show.id)) continue;
      seen.add(show.id);
      shows.push(show);
    }
  }
  return shows;
}

function upcomingFromDump(
  dump: TmDump,
  extra?: string,
  refreshing?: boolean,
): UpcomingResponse {
  const shows = showsFromTmEvents(dump.events);
  const hasCache = dump.at > 0;
  const cached = hasCache ? `cached ${cacheStamp(dump.at)}` : undefined;
  let message: string;
  if (extra && hasCache) {
    message = `${extra} Showing ${shows.length} catalog date${shows.length === 1 ? "" : "s"} (${cached}).`;
  } else if (!hasCache) {
    message =
      extra ??
      (refreshing
        ? "Connected to Ticketmaster. Filling in the background."
        : "Connected to Ticketmaster. No upcoming dates for catalog artists in the NY metro area yet.");
  } else if (shows.length === 0) {
    message = `Connected to Ticketmaster. No upcoming dates for catalog artists in the NY metro area yet (${cached}).`;
  } else {
    message = `Ticketmaster: ${shows.length} upcoming NY-metro date${shows.length === 1 ? "" : "s"} for catalog artists (${cached}).`;
  }
  if (refreshing && hasCache) message += " Updating in the background.";
  return { configured: true, message, shows, refreshing };
}

async function refreshTmDump(env: Env): Promise<void> {
  const apiKey = env.TICKETMASTER_API_KEY?.trim();
  if (!apiKey) return;

  const fetched = await fetchNyMetroEvents(apiKey);
  if (!fetched.failed) {
    tmLastExtra = undefined;
    await saveTmDump({ at: Date.now(), events: fetched.events });
    return;
  }

  const resetAt = fetched.quotaResetAt && fetched.quotaResetAt > Date.now() ? fetched.quotaResetAt : undefined;
  tmRefreshCooldownUntil = resetAt ?? Date.now() + 60_000;
  const reset = quotaResetLabel(fetched.quotaResetAt);
  tmLastExtra = fetched.rateLimited
    ? reset
      ? `Ticketmaster daily quota is used up until ${reset}.`
      : "Ticketmaster rate-limited this lookup."
    : "Ticketmaster returned an error.";
}

function scheduleTmRefresh(env: Env): void {
  if (tmRefresh) return;
  if (Date.now() < tmRefreshCooldownUntil) return;
  tmRefresh = refreshTmDump(env)
    .catch(() => undefined)
    .finally(() => {
      tmRefresh = null;
    });
}

export async function handleUpcoming(env: Env): Promise<{ status: number; body: UpcomingResponse }> {
  const apiKey = env.TICKETMASTER_API_KEY?.trim();

  if (!apiKey) {
    return {
      status: 200,
      body: {
        configured: false,
        message:
          "Ticketmaster is not configured. Add TICKETMASTER_API_KEY (Consumer Key) to .env. The key stays on the server.",
        shows: [],
      },
    };
  }

  const existing = await loadTmDump();
  const dump = existing ?? { at: 0, events: [] };
  const stale = !existing || !dumpIsFresh(dump);
  if (stale) scheduleTmRefresh(env);
  const refreshing = Boolean(tmRefresh);

  return {
    status: 200,
    body: upcomingFromDump(dump, tmLastExtra, refreshing),
  };
}

type CachedReleaseGroup = {
  artistMbid: string;
  id: string;
  title: string;
  date: string;
  primaryType?: string;
};

type ReleasesDump = {
  version?: number;
  at: number;
  windowStart: string;
  groups: CachedReleaseGroup[];
};

const RELEASES_CACHE_VERSION = 2;

type LegacyReleasesDump = {
  artists: Record<string, { at: number; groups: Omit<CachedReleaseGroup, "artistMbid">[] }>;
};

let releasesDumpMemory: ReleasesDump | undefined;
let releasesRefresh: Promise<void> | null = null;
let releasesRefreshCooldownUntil = 0;

type MbReleaseGroup = {
  id?: string;
  title?: string;
  "first-release-date"?: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "artist-credit"?: { artist?: { id?: string } }[];
};

type MbReleaseGroupSearch = {
  count?: number;
  "release-groups"?: MbReleaseGroup[];
};

function foldReleaseKey(artistId: string, title: string, date: string): string {
  return `${artistId}|${title.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${date}`;
}

function isAlbumOrEp(type?: string): boolean {
  const folded = type?.trim().toLowerCase();
  return folded === "album" || folded === "ep" || folded === "lp";
}

function keepReleaseGroup(group: MbReleaseGroup): boolean {
  const secondary = group["secondary-types"] ?? [];
  if (secondary.some((type) => SKIP_RG_SECONDARY.has(type))) return false;
  if (!isAlbumOrEp(group["primary-type"])) return false;
  return Boolean(group.id && group.title && group["first-release-date"]);
}

function emptyReleasesDump(): ReleasesDump {
  return { at: 0, windowStart: "", groups: [] };
}

function catalogReleaseMbids(): string[] {
  const ids: string[] = [];
  for (const artist of artists) {
    const mbid = artistMusicbrainzId(artist)?.trim().toLowerCase();
    if (mbid) ids.push(mbid);
  }
  return ids;
}

function normalizeReleasesDump(raw: unknown): ReleasesDump {
  if (!raw || typeof raw !== "object") return emptyReleasesDump();
  const next = raw as Partial<ReleasesDump> & Partial<LegacyReleasesDump>;
  if (Array.isArray(next.groups) && typeof next.at === "number") {
    return {
      version: next.version,
      at: next.at,
      windowStart: typeof next.windowStart === "string" ? next.windowStart : "",
      groups: next.groups.filter(
        (group): group is CachedReleaseGroup =>
          Boolean(group?.artistMbid && group.id && group.title && group.date),
      ),
    };
  }
  if (next.artists && typeof next.artists === "object") {
    const groups: CachedReleaseGroup[] = [];
    for (const [mbid, entry] of Object.entries(next.artists)) {
      for (const group of entry.groups ?? []) {
        if (!group?.id || !group.title || !group.date) continue;
        groups.push({
          artistMbid: mbid.toLowerCase(),
          id: group.id,
          title: group.title,
          date: group.date,
          primaryType: group.primaryType,
        });
      }
    }
    return { version: 1, at: 0, windowStart: "", groups };
  }
  return emptyReleasesDump();
}

function releasesDumpIsFresh(dump: ReleasesDump, windowStart: string): boolean {
  return (
    dump.version === RELEASES_CACHE_VERSION &&
    dump.windowStart === windowStart &&
    dump.at > 0 &&
    Date.now() - dump.at < RELEASES_TTL_MS
  );
}

async function loadReleasesDump(): Promise<ReleasesDump> {
  if (releasesDumpMemory) return releasesDumpMemory;
  const disk = await readJsonCache<unknown>(RELEASES_DUMP_FILE);
  const dump = normalizeReleasesDump(disk);
  releasesDumpMemory = dump;
  return dump;
}

async function saveReleasesDump(dump: ReleasesDump): Promise<void> {
  releasesDumpMemory = dump;
  await writeJsonCache(RELEASES_DUMP_FILE, dump);
}

async function searchReleaseGroupsForMbids(
  mbids: string[],
  windowStart: string,
  userAgent: string,
): Promise<CachedReleaseGroup[]> {
  const catalogSet = new Set(mbids);
  const aridClause = mbids.map((id) => `arid:"${id}"`).join(" OR ");
  const skipSecondary = [...SKIP_RG_SECONDARY].map((type) => `secondarytype:"${type}"`).join(" OR ");
  const query = `(${aridClause}) AND firstreleasedate:[${windowStart} TO ${MB_DATE_RANGE_END}] AND (primarytype:Album OR primarytype:EP) AND NOT (${skipSecondary})`;
  const groups: CachedReleaseGroup[] = [];

  for (let page = 0; page < MB_RG_MAX_PAGES; page += 1) {
    if (page > 0) await sleep(MB_RELEASE_GAP_MS);
    const offset = page * MB_RG_PAGE_SIZE;
    const url = `${MB_BASE}/release-group?query=${encodeURIComponent(query)}&limit=${MB_RG_PAGE_SIZE}&offset=${offset}&fmt=json`;
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`MusicBrainz ${response.status}`);
    const data = (await response.json()) as MbReleaseGroupSearch;
    const batch = data["release-groups"] ?? [];
    for (const group of batch) {
      if (!keepReleaseGroup(group) || !group.id || !group.title || !group["first-release-date"]) continue;
      const matched = new Set<string>();
      for (const credit of group["artist-credit"] ?? []) {
        const id = credit.artist?.id?.trim().toLowerCase();
        if (id && catalogSet.has(id)) matched.add(id);
      }
      for (const artistMbid of matched) {
        groups.push({
          artistMbid,
          id: group.id,
          title: group.title,
          date: group["first-release-date"],
          primaryType: group["primary-type"],
        });
      }
    }
    const total = data.count ?? 0;
    if (offset + batch.length >= total || batch.length === 0) break;
  }

  return groups;
}

async function refreshReleasesDump(env: Env): Promise<void> {
  const userAgent =
    env.MUSICBRAINZ_USER_AGENT?.trim() ||
    "music.dougkarda.com/0.1 (https://music.dougkarda.com)";
  const windowStart = yearStartIso();
  const mbids = catalogReleaseMbids();
  const groups: CachedReleaseGroup[] = [];
  let failed = 0;
  let started = false;

  for (let i = 0; i < mbids.length; i += MB_SEARCH_BATCH) {
    if (started) await sleep(MB_RELEASE_GAP_MS);
    started = true;
    const slice = mbids.slice(i, i + MB_SEARCH_BATCH);
    let batch: CachedReleaseGroup[] | undefined;
    for (let attempt = 1; attempt <= 3 && !batch; attempt += 1) {
      try {
        batch = await searchReleaseGroupsForMbids(slice, windowStart, userAgent);
      } catch {
        if (attempt < 3) await sleep(attempt * MB_RELEASE_GAP_MS);
      }
    }
    if (batch) {
      groups.push(...batch);
    } else {
      failed += 1;
    }
  }

  if (failed > 0) {
    releasesRefreshCooldownUntil = Date.now() + 60_000;
    return;
  }

  await saveReleasesDump({
    version: RELEASES_CACHE_VERSION,
    at: Date.now(),
    windowStart,
    groups,
  });
}

function scheduleReleasesRefresh(env: Env): void {
  if (releasesRefresh) return;
  if (Date.now() < releasesRefreshCooldownUntil) return;
  releasesRefresh = refreshReleasesDump(env)
    .catch(() => undefined)
    .finally(() => {
      releasesRefresh = null;
    });
}

function releasesFromDump(dump: ReleasesDump): Release[] {
  const out: Release[] = [];
  for (const group of dump.groups) {
    if (!inReleaseWindow(group.date) || !isAlbumOrEp(group.primaryType)) continue;
    const artistId = artistIdForMbid(group.artistMbid);
    if (!artistId) continue;
    out.push({
      id: `mb-${artistId}-${group.id}`,
      artistId,
      title: group.title,
      date: group.date,
      type: group.primaryType,
      source: "musicbrainz",
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

function mergeManualReleases(apiReleases: Release[]): Release[] {
  const byKey = new Map<string, Release>();
  for (const release of apiReleases) {
    byKey.set(foldReleaseKey(release.artistId, release.title, release.date), release);
  }
  for (const manual of manualReleases) {
    if (!inReleaseWindow(manual.date)) continue;
    if (manual.type && !isAlbumOrEp(manual.type)) continue;
    const key = foldReleaseKey(manual.artistId, manual.title, manual.date);
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, { ...existing, notes: manual.notes ?? existing.notes, source: "manual" });
    } else {
      byKey.set(key, manual);
    }
  }
  return [...byKey.values()].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export async function handleReleases(env: Env): Promise<{ status: number; body: ReleasesResponse }> {
  const dump = await loadReleasesDump();
  const windowStart = yearStartIso();
  const stale = !releasesDumpIsFresh(dump, windowStart);
  if (stale) scheduleReleasesRefresh(env);
  const refreshing = Boolean(releasesRefresh);

  const releases = mergeManualReleases(releasesFromDump(dump));
  const catalogCount = catalogReleaseMbids().length;
  let note = `MusicBrainz: ${releases.filter((release) => release.source === "musicbrainz").length} album/EP row(s) in this year’s window (${catalogCount} catalog IDs).`;
  if (refreshing) {
    note += releases.length
      ? " Updating in the background."
      : " Filling in the background — this list will appear shortly.";
  } else {
    note += " Cached 24h.";
  }

  return {
    status: 200,
    body: {
      releases,
      fetchedAt: new Date().toISOString(),
      note,
      refreshing,
    },
  };
}

export async function routeApi(
  req: IncomingMessage,
  res: ServerResponse,
  env: Env,
): Promise<boolean> {
  const url = req.url?.split("?")[0] ?? "";

  if (url === "/api/setlistfm/attended" && req.method === "GET") {
    try {
      const result = await handleAttended(env);
      sendJson(res, result.status, result.body);
    } catch (error) {
      const body: AttendedResponse = {
        configured: Boolean(env.SETLISTFM_API_KEY),
        message: error instanceof Error ? error.message : "Proxy error",
        shows: [],
      };
      sendJson(res, 500, body);
    }
    return true;
  }

  if (url === "/api/birthdays" && req.method === "GET") {
    try {
      const result = await handleBirthdays(env);
      sendJson(res, result.status, result.body);
    } catch (error) {
      const body: BirthdaysResponse = {
        birthdays: catalogBirthdays(),
        note: error instanceof Error ? error.message : "Proxy error",
      };
      sendJson(res, 500, body);
    }
    return true;
  }

  if (url === "/api/ticketmaster/upcoming" && req.method === "GET") {
    try {
      const result = await handleUpcoming(env);
      sendJson(res, result.status, result.body);
    } catch (error) {
      const body: UpcomingResponse = {
        configured: Boolean(env.TICKETMASTER_API_KEY),
        message: error instanceof Error ? error.message : "Proxy error",
        shows: [],
      };
      sendJson(res, 500, body);
    }
    return true;
  }

  if (url === "/api/releases" && req.method === "GET") {
    try {
      const result = await handleReleases(env);
      sendJson(res, result.status, result.body);
    } catch (error) {
      const body: ReleasesResponse = {
        releases: mergeManualReleases([]),
        note: error instanceof Error ? error.message : "Proxy error",
      };
      sendJson(res, 500, body);
    }
    return true;
  }

  if (url.startsWith("/api/")) {
    sendJson(res, 404, { message: "Unknown API route" });
    return true;
  }

  return false;
}
