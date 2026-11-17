/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { OTEL_LOGS_INDEX, OTEL_TRACES_INDEX } from '../../../../common/otel_data';
import type { SessionSummary } from '../../../../common/sessions';

/** Before the summarized start, as the timeline loads events from a minute earlier. */
const BEFORE_START_MS = 60_000;
/** After the summarized end, as raw events can be newer than the summary. */
const AFTER_END_MS = 5 * 60_000;

/** Every raw event of the session, in time order: for what the session page doesn't show. */
export const sessionEsqlQuery = ({
  serviceName,
  sessionId,
}: Pick<SessionSummary, 'serviceName' | 'sessionId'>): string =>
  esql.from(OTEL_TRACES_INDEX, OTEL_LOGS_INDEX)
    .pipe`WHERE session.id == ${sessionId} AND service.name == ${serviceName}`
    .pipe`SORT @timestamp ASC`.print('wrapping');

/**
 * The time range the session's raw events fall in, or `undefined` for a session the summaries have
 * no start or end time for, which the API returns as empty strings: such a session still shows,
 * only without a way into Discover.
 */
export const sessionTimeRange = ({
  startTime,
  endTime,
}: Pick<SessionSummary, 'startTime' | 'endTime'>): { from: string; to: string } | undefined => {
  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return undefined;
  }
  return {
    from: new Date(startMs - BEFORE_START_MS).toISOString(),
    to: new Date(endMs + AFTER_END_MS).toISOString(),
  };
};
