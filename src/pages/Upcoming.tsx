import { ShowGroups } from "../components/ShowGroups";
import { manualShows } from "../data/shows";
import { isUpcoming } from "../lib/dates";

export function Upcoming() {
  const upcoming = manualShows.filter((show) => isUpcoming(show.date));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">Upcoming</h1>
        <p className="text-muted">
          Dates still ahead — handwritten gigs for now, especially local and small bands APIs
          miss.
        </p>
      </header>
      <ShowGroups
        shows={upcoming}
        empty="No upcoming shows in the manual list yet."
      />
    </div>
  );
}
