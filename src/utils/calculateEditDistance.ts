/**
 * Calculate the Optimal String Alignment Distance (OSA).
 * The OSA distance is a measure of the similarity between two strings, allowing for insertions, deletions, substitutions, and adjacent transpositions.
 * It is a variant of the Levenshtein distance that also accounts for transpositions of adjacent characters.
 *
 * Reference: <https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance>
 *
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @returns The Optimal String Alignment Distance between the two strings.
 */
export function calculateEditDistance(a: string, b: string): number {
  // Note:
  // The original algorithm uses 1-based indexing for strings a and b,
  // but since JavaScript indices are 0-based, the implementation below uses 0-based indexing.
  const m = a.length;
  const n = b.length;

  // create a 2D array to store distances
  const dp: number[][] = Array.from(Array(m + 1), () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1, // deletion
        dp[i]![j - 1]! + 1, // insertion
        dp[i - 1]![j - 1]! + cost, // substitution
      );

      // adjacent transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + 1);
      }
    }
  }

  return dp[m]![n]!;
}
