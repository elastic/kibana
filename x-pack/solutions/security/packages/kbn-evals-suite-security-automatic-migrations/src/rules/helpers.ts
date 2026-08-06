/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Computes the Levenshtein edit distance between two strings using a DP matrix.
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, (_row, i) =>
    Array.from({ length: n + 1 }, (_col, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
};

/**
 * Returns a similarity score in [0, 1] based on Levenshtein distance,
 * rounded to 3 decimal places. Returns 1 when both strings are empty.
 */
export const levenshteinSimilarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 1000) / 1000;
};

/**
 * Returns true if the given ES|QL string contains a LOOKUP JOIN clause
 * (case-insensitive).
 */
export const esqlHasLookupJoin = (esql: string): boolean => /LOOKUP\s+JOIN/i.test(esql);
