/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Rounding = 'M' | 'w' | 'd';

// The rounding of the documents with a @timestamp at or after `from`, or of every document when `from` is null.
export interface RoutingSegment {
  from: number | null;
  rounding: Rounding;
}

// Segments sorted by `from`, the first one starting with a null `from`. A segment in effect never changes:
// changing it would route a rollup bucket rewritten later to a different index than the original document.
export interface SliRoutingState {
  segments: RoutingSegment[];
}

const ROUNDINGS: readonly Rounding[] = ['M', 'w', 'd'];

/** Returns the epoch millis of the first day of the next UTC month. */
export const startOfNextUtcMonth = (now: Date): number =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

/** Returns the epoch millis of the start of the next UTC day. */
export const startOfNextUtcDay = (now: Date): number =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);

/**
 * Computes the routing state of a routing pipeline created now with the configured rounding. Daily history
 * keeps the daily rounding of the indices written before the routing pipeline existed until the next UTC month.
 */
export const computeInitialRoutingState = ({
  configured,
  now,
  hasDailyHistory,
}: {
  configured: Rounding;
  now: Date;
  hasDailyHistory: boolean;
}): SliRoutingState =>
  hasDailyHistory && configured !== 'd'
    ? {
        segments: [
          { from: null, rounding: 'd' },
          { from: startOfNextUtcMonth(now), rounding: configured },
        ],
      }
    : { segments: [{ from: null, rounding: configured }] };

/**
 * Returns the routing state applying the configured rounding from the next UTC day. A segment not in effect
 * yet is changed in place, keeping its start, so the routing state holds at most one of them.
 */
export const reconcileRoutingState = (
  { segments }: SliRoutingState,
  configured: Rounding,
  now: Date
): SliRoutingState => {
  const last = segments[segments.length - 1];
  if (last.rounding === configured) {
    return { segments };
  }

  if (last.from !== null && last.from > now.getTime()) {
    const inEffect = segments.slice(0, -1);
    const previous = inEffect[inEffect.length - 1];
    return previous.rounding === configured
      ? { segments: inEffect }
      : { segments: [...inEffect, { from: last.from, rounding: configured }] };
  }

  return { segments: [...segments, { from: startOfNextUtcDay(now), rounding: configured }] };
};

const isRounding = (value: unknown): value is Rounding =>
  typeof value === 'string' && (ROUNDINGS as readonly string[]).includes(value);

const parseSegment = (value: unknown): RoutingSegment | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { from, rounding } = value as Record<string, unknown>;
  if (!isRounding(rounding)) {
    return undefined;
  }
  if (from !== null && (typeof from !== 'number' || !Number.isFinite(from))) {
    return undefined;
  }

  return { from, rounding };
};

// Only the first segment starts with a null `from`, and the others start in increasing order.
const isOrdered = (segments: RoutingSegment[]): boolean =>
  segments.every(({ from }, index) => {
    if (index === 0) {
      return from === null;
    }
    const previousFrom = segments[index - 1].from;
    return from !== null && (previousFrom === null || from > previousFrom);
  });

/** Reads the routing state stored in a routing pipeline `_meta`, or undefined when it is missing or malformed. */
export const parseRoutingStateFromMeta = (
  meta: Record<string, unknown> | undefined
): SliRoutingState | undefined => {
  const routing = meta?.routing;
  if (typeof routing !== 'object' || routing === null) {
    return undefined;
  }

  const { segments } = routing as Record<string, unknown>;
  if (!Array.isArray(segments) || segments.length === 0) {
    return undefined;
  }

  const parsed = segments
    .map(parseSegment)
    .filter((segment): segment is RoutingSegment => segment !== undefined);

  return parsed.length === segments.length && isOrdered(parsed) ? { segments: parsed } : undefined;
};
