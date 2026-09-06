import { useEffect, useMemo, useState } from "react";
import { ShowGroups } from "../components/ShowGroups";
import { manualShows } from "../data/shows";
import { mergePastManualShows } from "../lib/shows";
import type { AttendedResponse } from "../types";

export function Attended() {
  const [attended, setAttended] = useState<AttendedResponse | null>(null);

  useEffect(() => {
    void fetch("/api/setlistfm/attended")
      .then(async (response) => {
        const body = (await response.json()) as AttendedResponse;
        setAttended(body);
      })
      .catch(() => {
        setAttended({
          configured: false,
          message: "Could not reach the local API proxy. Is npm run dev running?",
          shows: [],
        });
      });
  }, []);

  const shows = useMemo(
    () => mergePastManualShows(attended?.shows ?? [], manualShows),
    [attended],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Attended</h1>
        <p className="text-muted">
          setlist.fm attendance plus past dates from the handwritten list — nights APIs miss
          still show up here once they have happened.
        </p>
      </header>
      {!attended ? (
        <p className="text-sm text-muted">Checking the setlist.fm proxy…</p>
      ) : attended.message ? (
        <p className="text-sm text-muted">{attended.message}</p>
      ) : null}
      <ShowGroups
        shows={shows}
        newestFirst
        empty={
          !attended
            ? "Loading attended shows…"
            : attended.configured
              ? "No attended shows yet — nothing on setlist.fm or in the past manual list."
              : "Placeholder until the API key is set on the server."
        }
      />
    </div>
  );
}
