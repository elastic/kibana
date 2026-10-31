/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Quiet stretch before skip-idle jumps to the next recorded event. */
export const SKIP_IDLE_THRESHOLD_MS = 2_000;

export interface SkipIdleEvent {
  type?: number;
  timestamp?: number;
}

/**
 * Offset to seek to when skip-idle is on.
 * Jump the next recorded event when the playhead is sitting in a gap longer
 * than the threshold. rrweb skipInactive needs pointer events (source 1–5) and
 * this session style of recording is often mutations + snapshots only.
 */
export const skipIdleSeekMs = (
  events: SkipIdleEvent[],
  currentMs: number,
  thresholdMs: number = SKIP_IDLE_THRESHOLD_MS
): number | null => {
  if (events.length === 0 || !Number.isFinite(currentMs) || currentMs < 0) {
    return null;
  }
  const start = events[0]?.timestamp;
  if (typeof start !== 'number') {
    return null;
  }

  const currentTs = start + currentMs;
  for (const event of events) {
    if (typeof event.timestamp !== 'number' || event.timestamp <= currentTs) {
      continue;
    }
    if (event.timestamp - currentTs <= thresholdMs) {
      return null;
    }
    return event.timestamp - start;
  }
  return null;
};
