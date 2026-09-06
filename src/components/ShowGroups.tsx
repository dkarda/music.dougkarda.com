import { useMemo } from "react";
import { formatShowDate, groupByMonth } from "../lib/dates";
import type { Show } from "../types";

export function ShowGroups({
  shows,
  empty,
  newestFirst = false,
}: {
  shows: Show[];
  empty: string;
  newestFirst?: boolean;
}) {
  const groups = useMemo(() => groupByMonth(shows, newestFirst), [shows, newestFirst]);
  if (shows.length === 0) {
    return <p className="text-muted">{empty}</p>;
  }
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="stub mb-3">{group.label}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {group.items.map((show) => (
              <li key={show.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <p className="font-medium">{show.artistName}</p>
                  <p className="text-sm text-muted">
                    {show.venue}
                    {show.city ? ` · ${show.city}` : ""}
                    {show.notes ? ` — ${show.notes}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-display text-sm tracking-wide text-chrome">
                  {show.url ? (
                    <a href={show.url} className="hover:text-amp" target="_blank" rel="noreferrer">
                      {formatShowDate(show.date)}
                    </a>
                  ) : (
                    formatShowDate(show.date)
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
