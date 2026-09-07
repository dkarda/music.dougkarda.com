import { artists } from "../data/artists";
import { getPersonById } from "../data/people";
import type { BirthdayAffiliation, BirthdayEntry, Person } from "../types";

export interface BirthdayCandidate {
  person: Person;
  affiliations: BirthdayAffiliation[];
  role?: string;
}

function roleParts(role?: string): string[] {
  if (!role?.trim()) return [];
  return role
    .split(/[/,&+]|\band\b/gi)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** One candidate per person, with every catalog affiliation and role attached. */
export function catalogBirthdayCandidates(): BirthdayCandidate[] {
  const candidates = new Map<string, {
    person: Person;
    affiliations: Map<string, BirthdayAffiliation>;
    roles: Map<string, string>;
  }>();

  const ensure = (personId: string) => {
    const person = getPersonById(personId);
    if (!person) throw new Error(`Unknown birthday person: ${personId}`);
    let candidate = candidates.get(personId);
    if (!candidate) {
      candidate = {
        person,
        affiliations: new Map(),
        roles: new Map(),
      };
      for (const role of roleParts(person.primaryRole)) {
        candidate.roles.set(role.toLowerCase(), role);
      }
      candidates.set(personId, candidate);
    }
    return candidate;
  };

  for (const artist of artists) {
    if (artist.kind === "person" && artist.personId) {
      const candidate = ensure(artist.personId);
      candidate.affiliations.set(artist.id, {
        artistId: artist.id,
        bandName: "Solo",
        role: candidate.person.primaryRole,
      });
    }
    for (const member of artist.members ?? []) {
      const candidate = ensure(member.personId);
      const existing = candidate.affiliations.get(artist.id);
      const roles = new Map<string, string>();
      for (const role of roleParts(existing?.role)) roles.set(role.toLowerCase(), role);
      for (const role of roleParts(member.role)) {
        roles.set(role.toLowerCase(), role);
        candidate.roles.set(role.toLowerCase(), role);
      }
      candidate.affiliations.set(artist.id, {
        artistId: artist.id,
        bandName: artist.name,
        role: roles.size ? [...roles.values()].join(" / ") : undefined,
      });
    }
  }

  return [...candidates.values()].map((candidate) => ({
    person: candidate.person,
    affiliations: [...candidate.affiliations.values()],
    role: candidate.roles.size ? [...candidate.roles.values()].join(" / ") : undefined,
  }));
}

/** People only: solo catalog artists and band members with a birth date. */
export function catalogBirthdays(): BirthdayEntry[] {
  return catalogBirthdayCandidates()
    .filter((candidate) => Boolean(candidate.person.birthDate))
    .map((candidate) => ({
      id: candidate.person.id,
      personId: candidate.person.id,
      name: candidate.person.name,
      birthDate: candidate.person.birthDate!,
      source: "catalog",
      affiliations: candidate.affiliations,
      role: candidate.role,
    }));
}
