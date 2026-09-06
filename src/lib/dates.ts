export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day = "01"] = iso.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function isUpcoming(iso: string, now = new Date()): boolean {
  return parseIsoDate(iso) >= parseIsoDate(todayIso(now));
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

export function nextOccurrence(iso: string, now = new Date()): Date {
  const original = parseIsoDate(iso);
  const next = new Date(now.getFullYear(), original.getMonth(), original.getDate());
  if (next < parseIsoDate(todayIso(now))) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
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
