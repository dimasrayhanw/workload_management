// src/constants.ts

/** Maps legacy email-style DB names → new short display names */
export const NAME_LEGACY_MAP: Record<string, string> = {
  "rayhan.widyaris": "Dimas",
  "hasna.tsany":     "Hasna",
  "adi.abdillah":    "Adi",
  "rifqi.naufal":    "Affan",
  "ade.dwiputro":    "Ade",
  "ghina.amani":     "Ghina",
  "azka.ismail":     "Azka",
  "daffa.rheza":     "Daffa",
  "satrio.nurcahyo": "Satrio",
  "dicky.elnur":     "Dicky",
  "heru.sujarko":    "Heru",
  "hamdani.adnan":   "Adnan",
  "vicky.firmansyah":"Vicky",
};

/** Returns the short display name for any user_name value (legacy or new) */
export function resolveDisplayName(raw: string): string {
  if (!raw) return "unknown";
  return NAME_LEGACY_MAP[raw.trim().toLowerCase()] ?? raw;
}

export const USER_NAMES = [
  // Team Leader
  "Sung-Bo",
  // Part 1
  "Iqbal", "Dary",
  "Fiqri", "Ghiffary", "Alim", "Stefani", "Naufal", "Dyas",
  "Akbari", "Albik", "Fairuz", "William", "Khunur", "Rezky",
  "Adam", "Nizar", "Sanin",
  // Part 2
  "Dimas", "Ghina",
  "Adi", "Dicky", "Annaz", "Heru", "Ade", "Putri",
  "Vicky", "Adnan", "Ryaas", "Hasna", "Daffa", "Zufar",
  "Satrio", "Azka", "Nico", "Micho", "Affan", "Hero", "Yasser",
  // Part 3
  "San", "Desi",
  "Evi", "Alfis", "Daniel", "Hamdan", "Zee", "Afiq",
  "Nadine", "Baskara", "Sijie", "Nathan",
];