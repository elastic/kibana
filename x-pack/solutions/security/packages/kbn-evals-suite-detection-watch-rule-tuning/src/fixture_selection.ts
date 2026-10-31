/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `EVAL_EXAMPLES=<n>` caps a run to the first `n` fixtures so a bounded smoke can exercise the
 * whole path (approval gate, trace probe, scoring) inside its time budget instead of being killed
 * mid-suite by a 39-fixture run. Unset means every fixture; anything that is not a positive
 * integer fails loudly rather than silently running the full (hours-long) suite.
 */
export const selectFixtures = <T>(fixtures: readonly T[], limit: string | undefined): T[] => {
  if (limit === undefined || limit.trim() === '') {
    return [...fixtures];
  }
  const n = Number(limit.trim());
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`EVAL_EXAMPLES must be a positive integer fixture count, got "${limit}"`);
  }
  return fixtures.slice(0, n);
};
