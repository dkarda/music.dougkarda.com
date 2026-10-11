import { useEffect, useMemo, useState } from "react";
import { LoadingBanner } from "../components/LoadingBanner";
import { ShowGroups } from "../components/ShowGroups";
import { manualShows } from "../data/shows";
import { mergeUpcomingShows } from "../lib/shows";
import type { UpcomingResponse } from "../types";

function catalogFallback(): UpcomingResponse {
  return {
    configured: false,
    message: "Could not reach the local API proxy. Is npm run dev running?",
    shows: [],
  };
}

export function Upcoming() {
  const [remote, setRemote] = useState<UpcomingResponse | null>(null);
  const [search, setSearch] = useState("");
  const [resetExpansionKey, setResetExpansionKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const load = () => {
      void fetch("/api/ticketmaster/upcoming")
        .then(async (response) => {
          const body = (await response.json()) as UpcomingResponse;
          if (cancelled) return;
          setRemote(body);
          if (body.refreshing && attempts < 40) {
            attempts += 1;
            timer = setTimeout(load, 2500);
          }
        })
        .catch(() => {
          if (!cancelled) setRemote(catalogFallback());
        });
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const shows = useMemo(
    () => mergeUpcomingShows(remote?.shows ?? [], manualShows),
    [remote],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredShows = useMemo(() => {
    if (!normalizedSearch) return shows;
    const exactArtistMatches = shows.filter(
      (show) => show.artistName.trim().toLowerCase() === normalizedSearch,
    );
    if (exactArtistMatches.length > 0) return exactArtistMatches;
    return shows.filter((show) =>
      [show.artistName, show.venue, show.city, show.notes, show.date]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [normalizedSearch, shows]);

  const waitingOnFill = !remote || (Boolean(remote.refreshing) && shows.length === 0);

  const resetView = () => {
    setSearch("");
    setResetExpansionKey((current) => current + 1);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Upcoming</h1>
        <p className="text-muted">
          Ticketmaster dates for catalog artists in the Long Island / New York metro area,
          plus handwritten gigs for local and small bands the API will miss.
        </p>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="upcoming-search">
          Search upcoming shows
        </label>
        <input
          id="upcoming-search"
          type="search"
          className="min-w-0 flex-1 border border-line bg-panel px-3 py-2 text-paper outline-none placeholder:text-muted focus:border-amp"
          placeholder="Search artist, venue, city, or year"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className="stub cursor-pointer hover:border-amp"
          onClick={resetView}
        >
          Reset
        </button>
      </div>
      {normalizedSearch ? (
        <p className="text-sm text-muted" aria-live="polite">
          {filteredShows.length} matching show{filteredShows.length === 1 ? "" : "s"}
        </p>
      ) : null}
      {remote?.refreshing && !waitingOnFill ? (
        <LoadingBanner label="Updating" />
      ) : null}
      {waitingOnFill ? (
        <LoadingBanner />
      ) : (
        <>
          {remote?.message ? <p className="text-sm text-muted">{remote.message}</p> : null}
          <ShowGroups
            shows={filteredShows}
            collapseByMonth
            expandAll={Boolean(normalizedSearch)}
            resetExpansionKey={resetExpansionKey}
            empty={
              normalizedSearch
                ? `No upcoming shows match “${search.trim()}”.`
                : remote?.configured
                ? "No upcoming dates yet — nothing on Ticketmaster or in the manual list."
                : "Add TICKETMASTER_API_KEY on the server, or a date in src/data/shows.ts."
            }
          />
        </>
      )}
    </div>
  );
}
