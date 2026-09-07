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

  const waitingOnFill = !attended || (Boolean(attended.refreshing) && shows.length === 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Attended</h1>
        <p className="text-muted">
          setlist.fm attendance plus past dates from the handwritten list — nights APIs miss
          still show up here once they have happened.
        </p>
      </header>
      {waitingOnFill ? (
        <LoadingBanner />
      ) : (
        <>
          {attended?.message ? <p className="text-sm text-muted">{attended.message}</p> : null}
          <ShowGroups
            shows={shows}
            newestFirst
            collapseByYear
            empty={
              attended?.configured
                ? "No attended shows yet — nothing on setlist.fm or in the past manual list."
                : "Placeholder until the API key is set on the server."
            }
          />
        </>
      )}
    </div>
  );
}
