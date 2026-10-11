import { useEffect, useMemo, useState } from "react";
import { formatShowDate, groupByMonth, monthKey, todayIso } from "../lib/dates";
import type { Show } from "../types";

function currentMonthKey() {
  return monthKey(todayIso());
}

function ShowList({
  group,
}: {
  group: ReturnType<typeof groupByMonth<Show>>[number];
}) {
  return (
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
  );
}

function MonthGroup({
  group,
  collapsible = false,
  expanded = true,
  onToggle,
}: {
  group: ReturnType<typeof groupByMonth<Show>>[number];
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  if (!collapsible) {
    return (
      <section>
        <h3 className="stub mb-3">{group.label}</h3>
        <ShowList group={group} />
      </section>
    );
  }

  const contentId = `shows-month-${group.key}`;
  return (
    <section>
      <h3>
        <button
          type="button"
          className="stub mb-3 inline-flex cursor-pointer items-center gap-2 hover:border-amp"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={onToggle}
        >
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          {group.label}
        </button>
      </h3>
      {expanded ? <div id={contentId}><ShowList group={group} /></div> : null}
    </section>
  );
}

export function ShowGroups({
  shows,
  empty,
  newestFirst = false,
  collapseByYear = false,
  collapseByMonth = false,
  expandAll = false,
  resetExpansionKey = 0,
}: {
  shows: Show[];
  empty: string;
  newestFirst?: boolean;
  collapseByYear?: boolean;
  collapseByMonth?: boolean;
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
  const [expandedMonths, setExpandedMonths] = useState(
    () => new Set([currentMonthKey()]),
  );

  useEffect(() => {
    setExpandedYears(new Set([String(new Date().getFullYear())]));
    setExpandedMonths(new Set([currentMonthKey()]));
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

  const toggleMonth = (key: string) => {
    setExpandedMonths((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
      {groups.map((group) => (
        <MonthGroup
          key={group.key}
          group={group}
          collapsible={collapseByMonth}
          expanded={expandAll || expandedMonths.has(group.key)}
          onToggle={() => {
            if (!expandAll) toggleMonth(group.key);
          }}
        />
      ))}
    </div>
  );
}
