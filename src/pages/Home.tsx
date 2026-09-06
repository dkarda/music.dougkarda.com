import { Link } from "react-router-dom";

const cards = [
  {
    to: "/upcoming",
    title: "Upcoming",
    body: "Dates still ahead. Ticketmaster for catalog bands, handwritten for local bills.",
  },
  {
    to: "/attended",
    title: "Attended",
    body: "Nights already seen, pulled from setlist.fm. The API key stays off the public bundle.",
  },
  {
    to: "/song-of-the-day",
    title: "Song of the Day",
    body: "One pick at a time. You choose the song and the video; nothing is auto-generated.",
  },
  {
    to: "/birthdays",
    title: "Birthdays",
    body: "Only people and bands in the allowlist. MusicBrainz when we have an ID, a date on the record when we don’t.",
  },
  {
    to: "/releases",
    title: "Releases",
    body: "Stub for now. Same artist list will drive it — not a personal Google Calendar as the long-term source.",
  },
];

export function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="font-display text-4xl leading-[1.05] tracking-wide uppercase sm:text-5xl">
          Music that already has a seat at the table.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          This is a living notebook, not a discovery engine. Artists live in a curated list.
          Small local bands get handwritten shows. APIs fill gaps only when we have IDs.
        </p>
      </section>
      <ul className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.to}>
            <Link
              to={card.to}
              className="block h-full border border-line bg-panel p-5 transition hover:border-amp"
            >
              <h2 className="font-display text-xl tracking-wide text-amp uppercase">{card.title}</h2>
              <p className="mt-2 text-sm text-muted">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
