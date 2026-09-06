import { useEffect, useMemo, useState } from "react";
import { ShowGroups } from "../components/ShowGroups";
import { manualShows } from "../data/shows";
import { mergeUpcomingShows } from "../lib/shows";
import type { UpcomingResponse } from "../types";

export function Upcoming() {
  const [remote, setRemote] = useState<UpcomingResponse | null>(null);

  useEffect(() => {
    void fetch("/api/ticketmaster/upcoming")
      .then(async (response) => {
        const body = (await response.json()) as UpcomingResponse;
        setRemote(body);
      })
      .catch(() => {
        setRemote({
          configured: false,
          message: "Could not reach the local API proxy. Is npm run dev running?",
          shows: [],
        });
      });
  }, []);

  const shows = useMemo(
    () => mergeUpcomingShows(remote?.shows ?? [], manualShows),
    [remote],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Upcoming</h1>
        <p className="text-muted">
          Ticketmaster dates for catalog artists in the Long Island / New York metro area,
          plus handwritten gigs for local and small bands the API will miss.
        </p>
      </header>
      {!remote ? (
        <p className="text-sm text-muted">Checking Ticketmaster…</p>
      ) : remote.message ? (
        <p className="text-sm text-muted">{remote.message}</p>
      ) : null}
      <ShowGroups
        shows={shows}
        empty={
          !remote
            ? "Loading upcoming shows…"
            : remote.configured
              ? "No upcoming dates yet — nothing on Ticketmaster or in the manual list."
              : "Add TICKETMASTER_API_KEY on the server, or a date in src/data/shows.ts."
        }
      />
    </div>
  );
}
