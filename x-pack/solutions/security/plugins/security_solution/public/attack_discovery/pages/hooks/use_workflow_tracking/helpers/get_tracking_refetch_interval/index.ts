/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Interval between successive `/tracking` polls while the run is in progress. */
export const TRACKING_POLL_INTERVAL_MS = 2_000;

/**
 * Safety window after which we stop polling `/tracking` even if generation and
 * validation tracking never appeared. Sized to comfortably exceed a normal run
 * (gate + generation + validation), which can take several minutes — the gate
 * phase alone can run ~45s before the generation tracking entry is written.
 *
 * Matches the 10-minute "running" boundary used by
 * `useGetAttackDiscoveryGeneration` so a healthy in-progress run is never
 * abandoned, while a run that never produces tracking (e.g. the server was
 * killed mid-execution, or a stale schedule-log row) is eventually bounded.
 */
export const MAX_TRACKING_POLLING_MS = 10 * 60 * 1000;

/**
 * Computes the react-query `refetchInterval` for the workflow tracking poll.
 *
 * Polling continues until BOTH generation and validation tracking are observed
 * (the data the flyout needs to render every pipeline row), or until the safety
 * window elapses — whichever comes first.
 *
 * @returns the poll interval in ms, or `false` to stop polling.
 */
export const getTrackingRefetchInterval = ({
  elapsedMs,
  hasGeneration,
  hasValidation,
  maxPollingMs = MAX_TRACKING_POLLING_MS,
  pollIntervalMs = TRACKING_POLL_INTERVAL_MS,
}: {
  elapsedMs: number;
  hasGeneration: boolean;
  hasValidation: boolean;
  maxPollingMs?: number;
  pollIntervalMs?: number;
}): number | false => {
  if (hasGeneration && hasValidation) {
    return false;
  }

  if (elapsedMs > maxPollingMs) {
    return false;
  }

  return pollIntervalMs;
};
