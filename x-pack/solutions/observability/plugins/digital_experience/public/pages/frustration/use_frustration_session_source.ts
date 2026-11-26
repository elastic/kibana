/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import type { SessionsStatus } from '../../../common/sessions';
import { useSessionsStatus } from '../../application/sessions_status_provider';
import type { FrustrationSessionSource } from './utils/frustration_esql';

const DAY_MS = 24 * 60 * 60 * 1000;
// A range as long as the retention, e.g. `now-30d`, is resolved a moment before `now` is read here.
const RETENTION_SLACK_MS = 60 * 1000;

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
  rangeStart >= now - status.retentionDays * DAY_MS - RETENTION_SLACK_MS
    ? 'summaries'
    : 'events';

/**
 * Where the per-session panels read sessions; `undefined` until the sessions status is known. It is
 * resolved once per `scope` (time range, environment, refresh), as another source remounts the
 * dashboard: a status that changes while the page is open waits for the next one.
 */
export const useFrustrationSessionSource = (
  rangeStart: number,
  scope: string
): FrustrationSessionSource | undefined => {
  const { status, error } = useSessionsStatus();
  const resolved = useRef<{ scope: string; source: FrustrationSessionSource }>();
  const current = status ? sessionSourceOf(status, rangeStart) : error ? 'events' : undefined;
  if (current && resolved.current?.scope !== scope) {
    resolved.current = { scope, source: current };
  }
  return resolved.current?.source;
};
