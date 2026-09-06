import { getArtistById } from "../data/artists";
import { manualReleases } from "../data/releases";
import { formatShowDate, groupByMonth, isUpcoming } from "../lib/dates";

export function Releases() {
  const upcoming = groupByMonth(manualReleases.filter((release) => isUpcoming(release.date)));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Releases</h1>
        <p className="text-muted">
          Stub. The long-term source is the same artist allowlist: MusicBrainz
          release-groups for artists with IDs, plus manual entries for small bands.
          Google Calendar is convenient for personal tracking, but it is not on-brand
          and does not scale as a public site database.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-2xl tracking-wide uppercase">Upcoming (manual)</h2>
        {upcoming.length === 0 && (
          <p className="text-muted">No manual upcoming releases. Add one in src/data/releases.ts.</p>
        )}
        {upcoming.map((group) => (
          <div key={group.key}>
            <h3 className="stub mb-3">{group.label}</h3>
            <ul className="divide-y divide-line border-y border-line">
              {group.items.map((release) => (
                <li key={release.id} className="py-3">
                  <p className="font-medium">{release.title}</p>
                  <p className="text-sm text-muted">
                    {getArtistById(release.artistId)?.name ?? release.artistId} · {release.type} ·{" "}
                    {formatShowDate(release.date)}
                  </p>
                  {release.notes && <p className="text-sm text-muted">{release.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
