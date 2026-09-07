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
          if (body.refreshing && attempts < 12) {
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

  const waitingOnFill = !remote || (Boolean(remote.refreshing) && shows.length === 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Upcoming</h1>
        <p className="text-muted">
          Ticketmaster dates for catalog artists in the Long Island / New York metro area,
          plus handwritten gigs for local and small bands the API will miss.
        </p>
      </header>
      {remote?.refreshing && !waitingOnFill ? (
        <LoadingBanner label="Updating" />
      ) : null}
      {waitingOnFill ? (
        <LoadingBanner />
      ) : (
        <>
          {remote?.message ? <p className="text-sm text-muted">{remote.message}</p> : null}
          <ShowGroups
            shows={shows}
            empty={
              remote?.configured
                ? "No upcoming dates yet — nothing on Ticketmaster or in the manual list."
                : "Add TICKETMASTER_API_KEY on the server, or a date in src/data/shows.ts."
            }
          />
        </>
      )}
    </div>
  );
}
