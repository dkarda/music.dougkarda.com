import { useEffect, useMemo, useState } from "react";
import { LoadingBanner } from "../components/LoadingBanner";
import { catalogBirthdays } from "../lib/birthdays";
import { birthdayLabel, nextOccurrence } from "../lib/dates";
import type { BirthdaysResponse } from "../types";

function catalogFallback(): BirthdaysResponse {
  return {
    birthdays: catalogBirthdays(),
    note: "Using local catalog dates; birthday proxy was unreachable.",
  };
}

export function Birthdays() {
  const [payload, setPayload] = useState<BirthdaysResponse | null>(null);

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

  const grouped = useMemo(() => {
    if (!payload) return [];
    const entries = payload.birthdays;
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
  }, [payload]);

  const waitingOnFill = !payload || (payload.refreshing && grouped.length === 0);

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

      {waitingOnFill ? (
        <LoadingBanner />
      ) : (
        grouped.map(([month, entries]) => (
          <section key={month}>
            <h2 className="stub mb-3">{month}</h2>
            <ul className="divide-y divide-line border-y border-line">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between py-3">
                  <div>
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-xs text-muted">
                      {entry.bandName
                        ? `${entry.bandName}${entry.role ? ` · ${entry.role}` : ""}`
                        : entry.source === "musicbrainz"
                          ? "MusicBrainz"
                          : "Catalog"}
                    </p>
                  </div>
                  <p className="font-display text-sm tracking-wide text-chrome">
                    {birthdayLabel(entry.birthDate)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
