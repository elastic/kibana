/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Rounding = 'M' | 'w' | 'd';

export interface SliRoutingState {
  before: Rounding;
  after: Rounding;
  cutover: number | null;
}

// Transform source ranges go back at most 90 days, plus a one day buffer.
export const ROUTING_GUARD_EXPIRY_MS = 91 * 24 * 60 * 60 * 1000;

const ROUNDINGS: readonly Rounding[] = ['M', 'w', 'd'];

/** Returns the epoch millis of the first day of the next UTC month. */
export const startOfNextUtcMonth = (now: Date): number =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

const effectiveRounding = (existing: SliRoutingState, now: Date): Rounding =>
  existing.cutover !== null && now.getTime() < existing.cutover ? existing.before : existing.after;

const withGuard = (before: Rounding, after: Rounding, now: Date): SliRoutingState => ({
  before,
  after,
  cutover: before === after ? null : startOfNextUtcMonth(now),
});

/** Computes the routing state a routing pipeline must hold, given its current state and the configured rounding. */
export const computeRoutingState = ({
  existing,
  configured,
  now,
  hasDailyHistory,
}: {
  existing: SliRoutingState | undefined;
  configured: Rounding;
  now: Date;
  hasDailyHistory: boolean;
}): SliRoutingState => {
  if (!existing) {
    return withGuard(hasDailyHistory ? 'd' : configured, configured, now);
  }

  if (existing.after !== configured) {
    return withGuard(effectiveRounding(existing, now), configured, now);
  }

  if (existing.cutover !== null && now.getTime() >= existing.cutover + ROUTING_GUARD_EXPIRY_MS) {
    return { before: existing.after, after: existing.after, cutover: null };
  }

  return existing;
};

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

  const { before, after, cutover } = routing as Record<string, unknown>;
  if (!isRounding(before) || !isRounding(after)) {
    return undefined;
  }
  if (cutover !== null && (typeof cutover !== 'number' || !Number.isFinite(cutover))) {
    return undefined;
  }

  return { before, after, cutover };
};

/** Returns true when both routing states are equal. */
export const isSameRoutingState = (a: SliRoutingState, b: SliRoutingState): boolean =>
  a.before === b.before && a.after === b.after && a.cutover === b.cutover;
