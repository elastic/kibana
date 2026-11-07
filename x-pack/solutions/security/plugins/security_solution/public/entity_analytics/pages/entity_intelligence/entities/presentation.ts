/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Human-friendly relative time ("4 min ago", "3 h ago"). Pure for testing. */
export const relativeTime = (ts: number | undefined, now: number): string => {
  if (ts === undefined) return '—';
  const diff = now - ts;
  if (diff < 0) return 'just now';
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MIN))} min ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`;
  if (diff < 60 * DAY) return `${Math.round(diff / DAY)} d ago`;
  return `${Math.round(diff / (30 * DAY))} mo ago`;
};

/** True when a timestamp is within `withinMs` of now (for "recent" styling). */
export const isRecent = (ts: number | undefined, now: number, withinMs: number): boolean =>
  ts !== undefined && now - ts < withinMs;

/** Normalizes an asset-criticality key to a short display label. */
export const criticalityLabel = (criticality: string | undefined): string => {
  if (!criticality) return 'Unassigned';
  return criticality
    .replace(/_impact$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Signed integer formatting for deltas ("+4", "-2", "0"). */
export const formatDelta = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

/** Whether an "up" movement is bad for a given tile direction. */
export const isUpBad = (direction: 'up-bad' | 'up-good' | 'neutral'): boolean =>
  direction === 'up-bad';
