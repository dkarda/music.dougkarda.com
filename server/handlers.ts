import { artists, artistIdForMbid } from "../src/data/artists";
import type {
  Artist,
  AttendedResponse,
  BirthdayEntry,
  BirthdaysResponse,
  Show,
  UpcomingResponse,
} from "../src/types";
import { isNyMetroCoords } from "../src/lib/geo";
import type { IncomingMessage, ServerResponse } from "node:http";

const SETLIST_BASE = "https://api.setlist.fm/rest/1.0";
const MB_BASE = "https://musicbrainz.org/ws/2";
const TM_BASE = "https://app.ticketmaster.com/discovery/v2";

type Env = Record<string, string>;

let birthdayCache: { at: number; payload: BirthdaysResponse } | null = null;
const BIRTHDAY_TTL_MS = 24 * 60 * 60 * 1000;

let attendedCache: { at: number; payload: AttendedResponse } | null = null;
const ATTENDED_TTL_MS = 60 * 60 * 1000;

let upcomingCache: { at: number; payload: UpcomingResponse } | null = null;
const UPCOMING_TTL_MS = 60 * 60 * 1000;
const TM_GAP_MS = 250;
const SETLIST_PAGE_GAP_MS = 550;
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
  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, text };
  }

  const data = (await response.json()) as SetlistFmAttendedPage;
  return { ok: true, data };
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

  if (attendedCache && Date.now() - attendedCache.at < ATTENDED_TTL_MS) {
    return { status: 200, body: attendedCache.payload };
  }

  const first = await fetchAttendedPage(apiKey, userId, 1);
  if (!first.ok) {
    return {
      status: 502,
      body: {
        configured: true,
        message: `setlist.fm responded ${first.status}. ${first.text.slice(0, 180)}`,
        shows: [],
      },
    };
  }

  const shows: Show[] = (first.data.setlist ?? []).map(mapSetlist);
  const total = first.data.total ?? shows.length;
  const perPage = first.data.itemsPerPage || 20;
  const pageCount = Math.min(SETLIST_MAX_PAGES, Math.max(1, Math.ceil(total / perPage)));

  for (let page = 2; page <= pageCount; page += 1) {
    await sleep(SETLIST_PAGE_GAP_MS);
    const next = await fetchAttendedPage(apiKey, userId, page);
    if (!next.ok) {
      const payload: AttendedResponse = {
        configured: true,
        message: `Loaded ${shows.length} of ${total} attended shows; setlist.fm page ${page} failed (${next.status}).`,
        shows: shows.slice().sort((a, b) => b.date.localeCompare(a.date)),
      };
      return { status: 200, body: payload };
    }
    shows.push(...(next.data.setlist ?? []).map(mapSetlist));
  }

  const payload: AttendedResponse = {
    configured: true,
    message:
      shows.length === 0
        ? "Connected. No attended setlists on this setlist.fm user yet."
        : total > shows.length
          ? `Connected. Showing ${shows.length} of ${total} attended shows (page cap).`
          : `Connected. ${shows.length} attended show${shows.length === 1 ? "" : "s"} from setlist.fm.`,
    shows: shows.slice().sort((a, b) => b.date.localeCompare(a.date)),
  };

  attendedCache = { at: Date.now(), payload };
  return { status: 200, body: payload };
}

type MbArtist = { id?: string; name?: string; "life-span"?: { begin?: string } };

async function fetchMbBeginDate(mbid: string, userAgent: string): Promise<string | undefined> {
  const url = `${MB_BASE}/artist/${encodeURIComponent(mbid)}?fmt=json`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });
  if (!response.ok) return undefined;
  const data = (await response.json()) as MbArtist;
  return data["life-span"]?.begin;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleBirthdays(env: Env): Promise<{ status: number; body: BirthdaysResponse }> {
  if (birthdayCache && Date.now() - birthdayCache.at < BIRTHDAY_TTL_MS) {
    return { status: 200, body: birthdayCache.payload };
  }

  const userAgent =
    env.MUSICBRAINZ_USER_AGENT?.trim() ||
    "music.dougkarda.com/0.1 (https://music.dougkarda.com)";

  const birthdays: BirthdayEntry[] = [];
  let fetched = 0;

  for (const artist of artists) {
    if (artist.beginDate) {
      birthdays.push({
        artistId: artist.id,
        name: artist.name,
        beginDate: artist.beginDate,
        source: "catalog",
      });
      continue;
    }

    if (!artist.musicbrainzId) continue;
    if (fetched >= 5) continue;

    await sleep(1100);
    const begin = await fetchMbBeginDate(artist.musicbrainzId, userAgent);
    fetched += 1;
    if (!begin) continue;

    birthdays.push({
      artistId: artist.id,
      name: artist.name,
      beginDate: begin,
      source: "musicbrainz",
    });
  }

  const payload: BirthdaysResponse = {
    birthdays,
    fetchedAt: new Date().toISOString(),
    note:
      fetched > 0
        ? `Enriched ${fetched} artist(s) from MusicBrainz (cached 24h, 1 req/s).`
        : "Using catalog beginDate fields. Add musicbrainzId without beginDate to enrich from MusicBrainz.",
  };

  birthdayCache = { at: Date.now(), payload };
  return { status: 200, body: payload };
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
  _embedded?: { venues?: TmVenue[] };
};

function foldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function namesAlign(catalog: string, remote: string): boolean {
  const a = foldName(catalog);
  const b = foldName(remote);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function usesTicketmaster(artist: Artist): boolean {
  if (artist.ticketmasterId?.trim()) return true;
  const tags = artist.tags ?? [];
  if (tags.includes("local") || tags.includes("small")) return false;
  return Boolean(artist.name.trim());
}

async function findAttractionId(
  apiKey: string,
  artist: Artist,
): Promise<string | undefined> {
  if (artist.ticketmasterId?.trim()) return artist.ticketmasterId.trim();

  const url = `${TM_BASE}/attractions.json?keyword=${encodeURIComponent(artist.name)}&classificationName=music&size=8&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return undefined;
  const data = (await response.json()) as { _embedded?: { attractions?: TmAttraction[] } };
  const match = (data._embedded?.attractions ?? []).find(
    (attraction) => attraction.id && attraction.name && namesAlign(artist.name, attraction.name),
  );
  return match?.id;
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
  if (!date) return undefined;
  const venue = event._embedded?.venues?.[0];
  if (!isNyMetroVenue(venue)) return undefined;
  const city = [venue?.city?.name, venue?.state?.stateCode ?? venue?.state?.name]
    .filter(Boolean)
    .join(", ");

  return {
    id: event.id ? `tm-${event.id}` : `tm-${artist.id}-${date}`,
    artistId: artist.id,
    artistName: artist.name,
    date,
    venue: venue?.name ?? "Unknown venue",
    city: city || undefined,
    source: "ticketmaster",
    url: event.url,
  };
}

async function fetchAttractionEvents(apiKey: string, attractionId: string, artist: Artist): Promise<Show[]> {
  const url = `${TM_BASE}/events.json?attractionId=${encodeURIComponent(attractionId)}&classificationName=music&size=100&sort=date,asc&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const data = (await response.json()) as { _embedded?: { events?: TmEvent[] } };
  return (data._embedded?.events ?? [])
    .map((event) => mapTmEvent(event, artist))
    .filter((show): show is Show => Boolean(show));
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

  if (upcomingCache && Date.now() - upcomingCache.at < UPCOMING_TTL_MS) {
    return { status: 200, body: upcomingCache.payload };
  }

  const shows: Show[] = [];
  const targets = artists.filter(usesTicketmaster);
  let failed = 0;

  for (let i = 0; i < targets.length; i += 1) {
    if (i > 0) await sleep(TM_GAP_MS);
    const artist = targets[i];
    try {
      const attractionId = await findAttractionId(apiKey, artist);
      if (!attractionId) continue;
      await sleep(TM_GAP_MS);
      shows.push(...(await fetchAttractionEvents(apiKey, attractionId, artist)));
    } catch {
      failed += 1;
    }
  }

  const payload: UpcomingResponse = {
    configured: true,
    message:
      shows.length === 0
        ? failed > 0
          ? "Connected to Ticketmaster, but no upcoming dates came back (or lookups failed)."
          : "Connected to Ticketmaster. No upcoming dates for catalog artists yet."
          : `Ticketmaster: ${shows.length} upcoming NY-metro date${shows.length === 1 ? "" : "s"} for catalog artists.`,
    shows,
  };

  upcomingCache = { at: Date.now(), payload };
  return { status: 200, body: payload };
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
        birthdays: [],
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

  if (url.startsWith("/api/")) {
    sendJson(res, 404, { message: "Unknown API route" });
    return true;
  }

  return false;
}
