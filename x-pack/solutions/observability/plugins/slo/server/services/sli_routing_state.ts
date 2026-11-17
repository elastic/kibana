/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Rounding = 'M' | 'w' | 'd';

// Set once, when the routing pipeline of a resources version is created. Documents with a @timestamp
// before `cutover` keep the daily rounding of the indices written before the routing pipeline existed.
export interface SliRoutingState {
  rounding: Rounding;
  cutover: number | null;
}

const ROUNDINGS: readonly Rounding[] = ['M', 'w', 'd'];

/** Returns the epoch millis of the first day of the next UTC month. */
export const startOfNextUtcMonth = (now: Date): number =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

/** Computes the routing state of a routing pipeline created now with the configured rounding. */
export const computeInitialRoutingState = ({
  configured,
  now,
  hasDailyHistory,
}: {
  configured: Rounding;
  now: Date;
  hasDailyHistory: boolean;
}): SliRoutingState => ({
  rounding: configured,
  cutover: hasDailyHistory && configured !== 'd' ? startOfNextUtcMonth(now) : null,
});

const isRounding = (value: unknown): value is Rounding =>
  typeof value === 'string' && (ROUNDINGS as readonly string[]).includes(value);

/** Reads the routing state stored in a routing pipeline `_meta`, or undefined when it is missing or malformed. */
export const parseRoutingStateFromMeta = (
  meta: Record<string, unknown> | undefined
): SliRoutingState | undefined => {
  const routing = meta?.routing;
  if (typeof routing !== 'object' || routing === null) {
    return undefined;
  }

  const { rounding, cutover } = routing as Record<string, unknown>;
  if (!isRounding(rounding)) {
    return undefined;
  }
  if (cutover !== null && (typeof cutover !== 'number' || !Number.isFinite(cutover))) {
    return undefined;
  }

  return { rounding, cutover };
};
