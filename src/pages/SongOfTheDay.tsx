import { getArtistById } from "../data/artists";
import { songsOfTheDay } from "../data/songs";
import { formatShowDate, todayIso } from "../lib/dates";

export function SongOfTheDay() {
  const today = todayIso();
  const featured =
    songsOfTheDay.find((song) => song.date === today) ??
    [...songsOfTheDay].sort((a, b) => b.date.localeCompare(a.date))[0];

  if (!featured) {
    return <p className="text-muted">Add a song in src/data/songs.ts to get started.</p>;
  }

  const artist = getArtistById(featured.artistId);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Song of the day</h1>
        <p className="text-muted">
          Picked by hand and shared with friends. The YouTube ID is curated; there is no
          YouTube Data API. Embeds use youtube-nocookie.
        </p>
      </header>

      <article className="space-y-4">
        <p className="stub">
          {featured.date === today ? "Today" : `Latest · ${formatShowDate(featured.date)}`}
        </p>
        <h2 className="font-display text-3xl tracking-wide">
          {featured.title}
          <span className="text-muted"> — {artist?.name ?? featured.artistId}</span>
        </h2>
        {featured.note && <p className="text-muted">{featured.note}</p>}
        <div className="aspect-video overflow-hidden border border-line bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${featured.youtubeVideoId}`}
            title={`${featured.title} by ${artist?.name ?? "artist"}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </article>

      {songsOfTheDay.length > 1 && (
        <section>
          <h3 className="stub mb-3">Archive</h3>
          <ul className="divide-y divide-line border-y border-line">
            {songsOfTheDay
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((song) => (
                <li key={`${song.date}-${song.youtubeVideoId}`} className="py-3">
                  <span className="font-display text-sm tracking-wide text-chrome">
                    {formatShowDate(song.date)}
                  </span>
                  <span className="text-muted"> · </span>
                  {song.title}
                  <span className="text-muted">
                    {" "}
                    — {getArtistById(song.artistId)?.name ?? song.artistId}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
