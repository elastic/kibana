/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SessionsStatus } from '../../../common/sessions';
import { useSessionsStatus } from '../../application/sessions_status_provider';
import type { FrustrationSessionSource } from './utils/frustration_esql';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The summaries only once they hold every session of the range: not before sessions are set up,
 * while the first build runs oldest first, when the task is behind (its checkpoint can be before
 * the whole range), can't keep them current or was turned off, or for a range that starts before
 * the oldest kept sessions.
 */
export const sessionSourceOf = (
  status: SessionsStatus | undefined,
  rangeStart: number,
  now: number = Date.now()
): FrustrationSessionSource =>
  status?.installed &&
  !status.rebuilding &&
  status.health === 'healthy' &&
  rangeStart >= now - status.retentionDays * DAY_MS
    ? 'summaries'
    : 'events';

/** Where the per-session panels read sessions; `undefined` until the sessions status is known. */
export const useFrustrationSessionSource = (
  rangeStart: number
): FrustrationSessionSource | undefined => {
  const { status, error } = useSessionsStatus();
  if (status) {
    return sessionSourceOf(status, rangeStart);
  }
  return error ? 'events' : undefined;
};
