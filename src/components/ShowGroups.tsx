import { useEffect, useMemo, useState } from "react";
import { formatShowDate, groupByMonth } from "../lib/dates";
import type { Show } from "../types";

function MonthGroup({
  group,
}: {
  group: ReturnType<typeof groupByMonth<Show>>[number];
}) {
  return (
    <section>
      <h3 className="stub mb-3">{group.label}</h3>
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
  );
}

export function ShowGroups({
  shows,
  empty,
  newestFirst = false,
  collapseByYear = false,
  expandAll = false,
  resetExpansionKey = 0,
}: {
  shows: Show[];
  empty: string;
  newestFirst?: boolean;
  collapseByYear?: boolean;
  expandAll?: boolean;
  resetExpansionKey?: number;
}) {
  const groups = useMemo(() => groupByMonth(shows, newestFirst), [shows, newestFirst]);
  const yearGroups = useMemo(() => {
    const years = new Map<string, typeof groups>();
    for (const group of groups) {
      const year = group.key.slice(0, 4);
      const months = years.get(year) ?? [];
      months.push(group);
      years.set(year, months);
    }
    return [...years.entries()];
  }, [groups]);
  const [expandedYears, setExpandedYears] = useState(
    () => new Set([String(new Date().getFullYear())]),
  );

  useEffect(() => {
    setExpandedYears(new Set([String(new Date().getFullYear())]));
  }, [resetExpansionKey]);

  const toggleYear = (year: string) => {
    setExpandedYears((current) => {
      const next = new Set(current);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  if (shows.length === 0) {
    return <p className="text-muted">{empty}</p>;
  }

  if (collapseByYear) {
    return (
      <div className="space-y-8">
        {yearGroups.map(([year, months]) => {
          const expanded = expandAll || expandedYears.has(year);
          const contentId = `shows-${year}`;
          return (
            <section key={year}>
              <h2>
                <button
                  type="button"
                  className="stub year-toggle mb-3 inline-flex cursor-pointer items-center gap-2"
                  aria-expanded={expanded}
                  aria-controls={contentId}
                  onClick={() => {
                    if (!expandAll) toggleYear(year);
                  }}
                >
                  <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                  {year}
                </button>
              </h2>
              {expanded && (
                <div id={contentId} className="space-y-8">
                  {months.map((group) => <MonthGroup key={group.key} group={group} />)}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => <MonthGroup key={group.key} group={group} />)}
    </div>
  );
}
