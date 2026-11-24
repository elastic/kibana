/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SESSIONS_SET_UP_BACKOFF_MS = 60 * 60 * 1000;

/** When setting sessions up last failed on this Kibana, so the app doesn't retry on every visit. */
export interface SessionsSetUpBackoff {
  failed: (now?: number) => void;
  succeeded: () => void;
  isBackingOff: (now?: number) => boolean;
}

/** Tracks setup failures on this Kibana only: each node retries at most once an hour. */
export const createSessionsSetUpBackoff = (): SessionsSetUpBackoff => {
  let failedAt: number | undefined;
  return {
    failed: (now = Date.now()) => {
      failedAt = now;
    },
    succeeded: () => {
      failedAt = undefined;
    },
    isBackingOff: (now = Date.now()) =>
      failedAt !== undefined && now - failedAt < SESSIONS_SET_UP_BACKOFF_MS,
  };
};
