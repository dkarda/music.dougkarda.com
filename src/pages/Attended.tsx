import { useEffect, useMemo, useState } from "react";
import { LoadingBanner } from "../components/LoadingBanner";
import { ShowGroups } from "../components/ShowGroups";
import { manualShows } from "../data/shows";
import { mergePastManualShows } from "../lib/shows";
import type { AttendedResponse } from "../types";

function catalogFallback(): AttendedResponse {
  return {
    configured: false,
    message: "Could not reach the local API proxy. Is npm run dev running?",
    shows: [],
  };
}

export function Attended() {
  const [attended, setAttended] = useState<AttendedResponse | null>(null);
  const [search, setSearch] = useState("");
  const [resetExpansionKey, setResetExpansionKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const load = () => {
      void fetch("/api/setlistfm/attended")
        .then(async (response) => {
          const body = (await response.json()) as AttendedResponse;
          if (cancelled) return;
          setAttended(body);
          if (body.refreshing && attempts < 20) {
            attempts += 1;
            timer = setTimeout(load, 2500);
          }
        })
        .catch(() => {
          if (!cancelled) setAttended(catalogFallback());
        });
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const shows = useMemo(
    () => mergePastManualShows(attended?.shows ?? [], manualShows),
    [attended],
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredShows = useMemo(() => {
    if (!normalizedSearch) return shows;
    const exactArtistMatches = shows.filter(
      (show) => show.artistName.trim().toLowerCase() === normalizedSearch,
    );
    if (exactArtistMatches.length > 0) return exactArtistMatches;
    return shows.filter((show) =>
      [
        show.artistName,
        show.venue,
        show.city,
        show.notes,
        show.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [normalizedSearch, shows]);

  const waitingOnFill = !attended || (Boolean(attended.refreshing) && shows.length === 0);

  const resetView = () => {
    setSearch("");
    setResetExpansionKey((current) => current + 1);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Attended</h1>
        <p className="text-muted">
          setlist.fm attendance plus past dates from the handwritten list — nights APIs miss
          still show up here once they have happened.
        </p>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="attended-search">
          Search attended shows
        </label>
        <input
          id="attended-search"
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
      {attended?.refreshing && !waitingOnFill ? (
        <LoadingBanner label="Updating" />
      ) : null}
      {waitingOnFill ? (
        <LoadingBanner />
      ) : (
        <>
          {attended?.message ? <p className="text-sm text-muted">{attended.message}</p> : null}
          <ShowGroups
            shows={filteredShows}
            newestFirst
            collapseByYear
            expandAll={Boolean(normalizedSearch)}
            resetExpansionKey={resetExpansionKey}
            empty={
              normalizedSearch
                ? `No attended shows match “${search.trim()}”.`
                : attended?.configured
                ? "No attended shows yet — nothing on setlist.fm or in the past manual list."
                : "Placeholder until the API key is set on the server."
            }
          />
        </>
      )}
    </div>
  );
}
