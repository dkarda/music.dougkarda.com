import { useEffect, useMemo, useState } from "react";
import { LoadingBanner } from "../components/LoadingBanner";
import { catalogBirthdays } from "../lib/birthdays";
import { ageOnNextBirthday, birthdayLabel, nextOccurrence } from "../lib/dates";
import type { BirthdaysResponse } from "../types";
import { RoleIcons } from "../components/RoleIcons";

function catalogFallback(): BirthdaysResponse {
  return {
    birthdays: catalogBirthdays(),
    note: "Using local catalog dates; birthday proxy was unreachable.",
  };
}

export function Birthdays() {
  const [payload, setPayload] = useState<BirthdaysResponse | null>(null);
  const [search, setSearch] = useState("");
  const [expandedMonths, setExpandedMonths] = useState(
    () =>
      new Set([
        new Date().toLocaleDateString("en-US", { month: "long" }),
      ]),
  );

  const toggleMonth = (month: string) => {
    setExpandedMonths((current) => {
      const next = new Set(current);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const load = () => {
      void fetch("/api/birthdays")
        .then(async (response) => {
          const body = (await response.json()) as BirthdaysResponse;
          if (cancelled) return;
          setPayload(body);
          if (body.refreshing && attempts < 12) {
            attempts += 1;
            timer = setTimeout(load, 2500);
          }
        })
        .catch(() => {
          if (!cancelled) setPayload(catalogFallback());
        });
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const grouped = useMemo(() => {
    if (!payload) return [];
    let entries = payload.birthdays;
    if (normalizedSearch) {
      const exactNameMatches = entries.filter(
        (entry) => entry.name.trim().toLowerCase() === normalizedSearch,
      );
      entries =
        exactNameMatches.length > 0
          ? exactNameMatches
          : entries.filter((entry) =>
              [
                entry.name,
                entry.role,
                entry.birthDate,
                ...entry.affiliations.map((affiliation) => affiliation.bandName),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(normalizedSearch),
            );
    }
    const withNext = entries.map((entry) => ({
      ...entry,
      next: nextOccurrence(entry.birthDate),
    }));
    withNext.sort((a, b) => a.next.getTime() - b.next.getTime());

    const months = new Map<string, typeof withNext>();
    for (const entry of withNext) {
      const key = entry.next.toLocaleDateString("en-US", { month: "long" });
      const list = months.get(key) ?? [];
      list.push(entry);
      months.set(key, list);
    }
    return [...months.entries()];
  }, [normalizedSearch, payload]);

  const waitingOnFill =
    !payload || (payload.refreshing && payload.birthdays.length === 0);

  const resetView = () => {
    setSearch("");
    setExpandedMonths(
      new Set([
        new Date().toLocaleDateString("en-US", { month: "long" }),
      ]),
    );
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Birthdays</h1>
        <p className="text-muted">
          People only — catalog solo artists and anyone listed in a band’s
          <code className="mx-1 text-amp">members</code>
          array. Band founding dates stay on the record as
          <code className="mx-1 text-amp">birthDate</code>
          but do not appear here.
        </p>
        {payload?.note && <p className="text-sm text-muted">{payload.note}</p>}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="birthday-search">
          Search birthdays
        </label>
        <input
          id="birthday-search"
          type="search"
          className="min-w-0 flex-1 border border-line bg-panel px-3 py-2 text-paper outline-none placeholder:text-muted focus:border-amp"
          placeholder="Search person, band, role, or date"
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
      {waitingOnFill ? (
        <LoadingBanner />
      ) : grouped.length === 0 && normalizedSearch ? (
        <p className="text-muted">No birthdays match “{search.trim()}”.</p>
      ) : (
        grouped.map(([month, entries]) => {
          const expanded = Boolean(normalizedSearch) || expandedMonths.has(month);
          const contentId = `birthdays-${month.toLowerCase()}`;
          return (
          <section key={month}>
            <h2>
              <button
                type="button"
                className="stub mb-3 inline-flex cursor-pointer items-center gap-2 hover:border-amp"
                aria-expanded={expanded}
                aria-controls={contentId}
                onClick={() => {
                  if (!normalizedSearch) toggleMonth(month);
                }}
              >
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                {month}
              </button>
            </h2>
            {expanded && (
            <ul id={contentId} className="divide-y divide-line border-y border-line">
              {entries.map((entry) => {
                const age = ageOnNextBirthday(entry.birthDate);
                return (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <div className="flex min-w-[9rem] flex-[1.2] items-center gap-3">
                    <div>
                      <p className="font-medium">{entry.name}</p>
                      {entry.role && (
                        <p className="text-xs text-muted">{entry.role}</p>
                      )}
                    </div>
                    <RoleIcons role={entry.role} />
                  </div>
                  <p className="min-w-[7rem] flex-1 text-sm text-muted">
                    {entry.affiliations.length
                      ? entry.affiliations.map((affiliation) => affiliation.bandName).join(" · ")
                      : "Solo"}
                  </p>
                  <div className="ml-auto shrink-0 text-right">
                    <p className="font-display text-sm tracking-wide text-chrome">
                      {birthdayLabel(entry.birthDate)}
                    </p>
                    {age != null && (
                      <p className="text-xs text-muted">turns {age}</p>
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
            )}
          </section>
          );
        })
      )}
    </div>
  );
}
