# music.dougkarda.com

A small, curated music site. The **artist catalog is the allowlist**: if a band is not in `src/data/artists.ts`, they do not belong on the site. APIs fill in details; they do not decide who appears.

## Run it

```bash
cp .env.example .env   # Windows: copy .env.example .env
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). `npm run dev` starts the React app **and** the local `/api` proxy.

```bash
npm run build
npm run preview
```

`preview` also attaches the proxy so `/api` still works locally.

## How to add an artist

Edit `src/data/artists.ts` and add an object:

- `id` — stable slug used by shows, songs, and releases
- `name`
- `musicbrainzId` — optional UUID from the MusicBrainz artist page
- `ticketmasterId` — optional Discovery attraction id (`K8vZ…`); Upcoming uses this instead of a name search
- `setlistFmMbid` — optional; often the same UUID as MusicBrainz
- `beginDate` — optional `YYYY-MM-DD` (or `YYYY-MM`) birthday / founding date
- `tags` — `local`, `small`, `favorite`
- `notes`, `members` — optional

Local and small bands do **not** need IDs. Add them anyway so they can have handwritten shows.

## How to add a manual show

Edit `src/data/shows.ts`. Use an `artistId` that already exists in the catalog. Upcoming vs past is derived from `date`.

Manual releases (small bands, or anything MusicBrainz will miss) go in `src/data/releases.ts`.

Song of the day: `src/data/songs.ts`. Paste the YouTube video ID from the URL (`watch?v=VIDEO_ID`). No YouTube API.

## setlist.fm API key (why the proxy exists)

Vite `VITE_` env vars are baked into the **browser bundle**. Anyone can read them. That is not a safe place for `SETLISTFM_API_KEY`.

This repo keeps the key on the server:

1. Put `SETLISTFM_API_KEY` and `SETLISTFM_USER_ID` in `.env` (see `.env.example`).
2. The browser calls `/api/setlistfm/attended`.
3. Vite middleware in `server/` adds the `x-api-key` header and talks to setlist.fm.

Attended setlists come from the configured setlist.fm user **in full** — they are not limited to `src/data/artists.ts`. The catalog still gates birthdays, songs, and other curated pages.

### Production

Static hosts do not run Vite middleware. Use the same handlers (`server/handlers.ts`, re-exported from `api/handlers.ts`) as a Netlify, Vercel, or Cloudflare function, and set `SETLISTFM_API_KEY` in the host's environment — still **without** a `VITE_` prefix.

## Pre-Deploy
If you changed artists.ts and/or people.ts:
npm run sort:catalogs
npm run build:hosting

If you only changed releases.ts and/or shows.ts:
npm run build:hosting

## Deploy
cPanel -> Software -> Setup Node.js App -> Stop the app 
Replace app.cjs and dist/ from hosting-upload/
(upload the contents, not the folder itself)
Start the app again.

## Data sources

### Recommendation: hybrid

| Approach | Strength | Cost |
| --- | --- | --- |
| Google Calendar | Fast for one person; easy to drop in a local opener nobody else tracks | Not a public CMS; hard to filter “only my artists”; not on-brand |
| Curated list + APIs | On-brand, shareable, limited to bands you care about | Needs MBIDs, a proxy, and patience with rate limits |
| **Hybrid (this repo)** | Catalog + manual events for local/small bands + APIs where IDs exist | Best fit |

Keep using Calendar privately if it helps you remember a Tuesday gig. The site should not treat Calendar as the database.

### setlist.fm

- Docs: [API 1.0](https://api.setlist.fm/docs/1.0/index.html)
- Auth: `x-api-key` header; `Accept: application/json`
- Typical consumer rate limit: **2 requests/second**
- Useful here: `GET /rest/1.0/user/{userId}/attended` (concerts you marked as attended)
- Also: `GET /rest/1.0/artist/{mbid}/setlists` (that artist’s logged setlists)

Honest limitation: setlist.fm is a **past setlist / attendance** database. Fans sometimes log upcoming dates, but it is a weak tour-dates source. Do not expect it to replace “what’s on this month.”

Register a key at [setlist.fm API settings](https://www.setlist.fm/settings/api). Respect their attribution and terms.

### MusicBrainz (birthdays + future releases)

- Docs: [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API)
- No API key. A descriptive **User-Agent** (app + contact) is required.
- Rate: about **1 request/second**. This app caches birthdays 24h, skips artists who already have `beginDate`, and fetches at most a handful of missing IDs per cache fill.
- Birthdays / founding: `GET /ws/2/artist/{mbid}?fmt=json` → `life-span.begin`
- Future releases: `GET /ws/2/release-group?artist={mbid}&fmt=json` (not wired up yet — see Releases stub)

There is no polite “all artist birthdays on Earth” feed we should use. Filter to the catalog.

### Upcoming shows for “bands I care about”

Ticketmaster Discovery is wired for catalog dates in the NY metro area (geoPoint + 60 miles). A background refresh at most once per 24h queries each artist’s `ticketmasterId`, then a metro dump only as a name-match fallback for artists without an ID. Local/small bands are skipped unless they have a Ticketmaster id. Results merge with handwritten `shows.ts`. Cache: `.cache/ticketmaster-ny-events.json`.

## Layout

Lists grouped by month (upcoming vs past), not a sparse calendar. The dataset is meant to stay small.

## Suggested next steps

1. Copy `.env.example` → `.env` and paste a setlist.fm key + username when you want attended history.
2. Replace the placeholder artists with the real allowlist (MusicBrainz IDs from artist pages).
3. Add `ticketmasterId` on catalog artists you want Upcoming to pick up automatically; keep local bills in `shows.ts`.
4. When hosting, add a serverless function that reuses `handleAttended` / `handleBirthdays`.
