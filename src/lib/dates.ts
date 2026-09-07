export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  const [year, month = "01", day = "01"] = iso.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isUpcoming(iso: string, now = new Date()): boolean {
  return parseIsoDate(iso) >= parseIsoDate(todayIso(now));
}

export function yearStartIso(now = new Date()): string {
  return `${now.getFullYear()}-01-01`;
}

/** Jan 1 of the current local year through any later date. */
export function inReleaseWindow(iso: string, now = new Date()): boolean {
  return parseIsoDate(iso) >= parseIsoDate(yearStartIso(now));
}

export function monthKey(iso: string): string {
  const date = parseIsoDate(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatShowDate(iso: string): string {
  const parts = iso.split("-");
  const date = parseIsoDate(iso);
  if (parts.length < 3) {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function monthDayLabel(iso: string): string {
  const date = parseIsoDate(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function birthdayLabel(iso: string): string {
  const parts = iso.split("-");
  const date = parseIsoDate(iso);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function nextOccurrence(iso: string, now = new Date()): Date {
  const original = parseIsoDate(iso);
  const next = new Date(now.getFullYear(), original.getMonth(), original.getDate());
  if (next < parseIsoDate(todayIso(now))) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

/** Full birth dates only. Year-only founding dates are not used on Birthdays. */
export function ageOnNextBirthday(iso: string, now = new Date()): number | undefined {
  const parts = iso.split("-");
  if (parts.length < 2) return undefined;
  const year = Number(parts[0]);
  if (!Number.isFinite(year) || year < 1800) return undefined;
  return nextOccurrence(iso, now).getFullYear() - year;
}

export function groupByMonth<T extends { date: string }>(
  items: T[],
  newestFirst = false,
): { key: string; label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = monthKey(item.date);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  const compare = (a: string, b: string) =>
    newestFirst ? b.localeCompare(a) : a.localeCompare(b);
  return [...map.entries()]
    .sort(([a], [b]) => compare(a, b))
    .map(([key, grouped]) => ({
      key,
      label: monthLabel(grouped[0].date),
      items: grouped.sort((a, b) => compare(a.date, b.date)),
    }));
}
