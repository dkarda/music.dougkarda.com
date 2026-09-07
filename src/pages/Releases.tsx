import { useEffect, useMemo, useState } from "react";
import { LoadingBanner } from "../components/LoadingBanner";
import { getArtistById } from "../data/artists";
import { manualReleases } from "../data/releases";
import { formatShowDate, groupByMonth, inReleaseWindow } from "../lib/dates";
import type { ReleasesResponse } from "../types";

function catalogFallback(): ReleasesResponse {
  return {
    releases: manualReleases.filter((release) => {
      const type = release.type?.trim().toLowerCase();
      if (type === "single") return false;
      return inReleaseWindow(release.date);
    }),
    note: "Using handwritten releases; the MusicBrainz proxy was unreachable.",
  };
}

export function Releases() {
  const [payload, setPayload] = useState<ReleasesResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const load = () => {
      void fetch("/api/releases")
        .then(async (response) => {
          const body = (await response.json()) as ReleasesResponse;
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

  const groups = useMemo(() => {
    if (!payload) return [];
    return groupByMonth(payload.releases, true);
  }, [payload]);

  const waitingOnFill = !payload || (payload.refreshing && groups.length === 0);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Releases</h1>
        <p className="text-muted">
          Albums and EPs for catalog artists with a MusicBrainz ID — this year
          and anything dated later. Handwritten rows in
          <code className="mx-1 text-amp">releases.ts</code>
          still fill gaps MusicBrainz will miss.
        </p>
        {payload?.note && <p className="text-sm text-muted">{payload.note}</p>}
      </header>

      {waitingOnFill ? (
        <LoadingBanner />
      ) : groups.length === 0 ? (
        <p className="text-muted">
          No albums or EPs in this year’s window yet. Add a date in
          src/data/releases.ts if MusicBrainz is missing one.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <h2 className="stub mb-3">{group.label}</h2>
            <ul className="divide-y divide-line border-y border-line">
              {group.items.map((release) => (
                <li key={release.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                  <div>
                    <p className="font-medium">{release.title}</p>
                    <p className="text-sm text-muted">
                      {getArtistById(release.artistId)?.name ?? release.artistId}
                      {release.type ? ` · ${release.type}` : ""}
                      {release.source === "manual" ? " · handwritten" : ""}
                    </p>
                    {release.notes && <p className="text-sm text-muted">{release.notes}</p>}
                  </div>
                  <p className="shrink-0 font-display text-sm tracking-wide text-chrome">
                    {formatShowDate(release.date)}
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
