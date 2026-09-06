import { useEffect, useMemo, useState } from "react";
import { artists } from "../data/artists";
import { monthDayLabel, nextOccurrence } from "../lib/dates";
import type { BirthdayEntry, BirthdaysResponse } from "../types";

function catalogFallback(): BirthdayEntry[] {
  return artists.flatMap((artist) =>
    artist.beginDate
      ? [
          {
            artistId: artist.id,
            name: artist.name,
            beginDate: artist.beginDate,
            source: "catalog" as const,
          },
        ]
      : [],
  );
}

export function Birthdays() {
  const [payload, setPayload] = useState<BirthdaysResponse | null>(null);

  useEffect(() => {
    void fetch("/api/birthdays")
      .then(async (response) => {
        const body = (await response.json()) as BirthdaysResponse;
        setPayload(body);
      })
      .catch(() => {
        setPayload({
          birthdays: catalogFallback(),
          note: "Using local catalog dates; birthday proxy was unreachable.",
        });
      });
  }, []);

  const grouped = useMemo(() => {
    const entries = payload?.birthdays ?? catalogFallback();
    const withNext = entries.map((entry) => ({
      ...entry,
      next: nextOccurrence(entry.beginDate),
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

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Birthdays</h1>
        <p className="text-muted">
          Not the whole music world’s calendar — only the curated list. MusicBrainz
          <code className="mx-1 text-amp">life-span.begin</code>
          is the planned public source (founding date for bands, birth date for people).
          Local <code className="mx-1 text-amp">beginDate</code> fields win so we do not
          hammer their API from the browser.
        </p>
        {payload?.note && <p className="text-sm text-muted">{payload.note}</p>}
      </header>

      {grouped.map(([month, entries]) => (
        <section key={month}>
          <h2 className="stub mb-3">{month}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {entries.map((entry) => (
              <li key={entry.artistId} className="flex items-baseline justify-between py-3">
                <div>
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-xs text-muted">{entry.source === "musicbrainz" ? "MusicBrainz" : "Catalog"}</p>
                </div>
                <p className="font-display text-sm tracking-wide text-chrome">
                  {monthDayLabel(entry.beginDate)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
