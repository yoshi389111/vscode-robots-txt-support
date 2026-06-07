import { calculateEditDistance } from "./utils/calculateEditDistance";
import { DIRECTIVE_LOOKUP } from "./data/directiveInfo";

/** The maximum allowed edit distance for considering two directives as similar. */
const SIMILARITY_THRESHOLD = 2;

/**
 * Finds a known directive that is similar to the given directive part based on edit distance.
 * @param directivePart The directive part to compare.
 * @returns The name of a similar known directive if found within the similarity threshold, otherwise `undefined`.
 */
export function getSimilarDirectives(
  directivePart: string,
): string | undefined {
  const inputName = normalizeString(directivePart);
  let bestMatch: { name: string; distance: number } | null = null;
  for (const info of Object.values(DIRECTIVE_LOOKUP)) {
    const knownName = normalizeString(info.name);
    const distance = calculateEditDistance(inputName, knownName);
    if (
      distance <= SIMILARITY_THRESHOLD &&
      (!bestMatch || distance < bestMatch.distance)
    ) {
      bestMatch = { name: info.name, distance };
    }
  }

  if (bestMatch) {
    return bestMatch.name;
  } else {
    return undefined;
  }
}

/**
 * Normalizes a directive name by converting it to lowercase and removing hyphens and underscores.
 * @param name The directive name to normalize.
 * @returns The normalized directive name.
 */
function normalizeString(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, "");
}
