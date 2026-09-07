import { artists } from "../data/artists";
import type { BirthdayEntry } from "../types";

/** People only: catalog persons plus band members with a birthDate. */
export function catalogBirthdays(): BirthdayEntry[] {
  const entries: BirthdayEntry[] = [];

  for (const artist of artists) {
    if (artist.kind === "person" && artist.birthDate) {
      entries.push({
        id: artist.id,
        artistId: artist.id,
        name: artist.name,
        birthDate: artist.birthDate,
        source: "catalog",
      });
    }

    for (const member of artist.members ?? []) {
      if (!member.birthDate) continue;
      entries.push({
        id: `${artist.id}:${member.musicbrainzId || member.name}`,
        artistId: artist.id,
        name: member.name,
        birthDate: member.birthDate,
        source: "catalog",
        bandName: artist.name,
        role: member.role,
      });
    }
  }

  return entries;
}
