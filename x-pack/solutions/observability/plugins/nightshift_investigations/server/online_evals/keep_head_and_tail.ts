/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The share of the budget kept from the start of an investigation when it does not fit. The
 * start sets the scope; the end is where the agent narrows in on the cause and concludes.
 */
export const HEAD_BUDGET_SHARE = 0.25;

/** The items kept from each end: `[0, headEnd)` and `[tailStart, length)`. */
export interface HeadAndTail {
  headEnd: number;
  tailStart: number;
  /** How many items between the two ends were left out. */
  omitted: number;
}

/**
 * Picks the items to keep within `budget` when they don't all fit: the earliest ones up to
 * `HEAD_BUDGET_SHARE` of it, then the latest ones with the rest. Budget the end leaves unused
 * goes back to the start, so the kept items are as many as fit.
 */
export const keepHeadAndTail = (sizes: readonly number[], budget: number): HeadAndTail => {
  const { length } = sizes;
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total <= budget) {
    return { headEnd: length, tailStart: length, omitted: 0 };
  }

  let used = 0;
  let headEnd = 0;
  while (headEnd < length && used + sizes[headEnd] <= budget * HEAD_BUDGET_SHARE) {
    used += sizes[headEnd];
    headEnd++;
  }
  let tailStart = length;
  while (tailStart > headEnd && used + sizes[tailStart - 1] <= budget) {
    used += sizes[tailStart - 1];
    tailStart--;
  }
  while (headEnd < tailStart && used + sizes[headEnd] <= budget) {
    used += sizes[headEnd];
    headEnd++;
  }

  return { headEnd, tailStart, omitted: tailStart - headEnd };
};
