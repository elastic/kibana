/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
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
  [
    `FROM ${OTEL_TRACES_INDEX}, ${OTEL_LOGS_INDEX}`,
    `| WHERE session.id == ${escapeStringValue(sessionId)} AND service.name == ${escapeStringValue(
      serviceName
    )}`,
    '| SORT @timestamp ASC',
  ].join('\n');

/** The time range the session's raw events fall in. */
export const sessionTimeRange = ({
  startTime,
  endTime,
}: Pick<SessionSummary, 'startTime' | 'endTime'>): { from: string; to: string } => ({
  from: new Date(Date.parse(startTime) - BEFORE_START_MS).toISOString(),
  to: new Date(Date.parse(endTime) + AFTER_END_MS).toISOString(),
});
