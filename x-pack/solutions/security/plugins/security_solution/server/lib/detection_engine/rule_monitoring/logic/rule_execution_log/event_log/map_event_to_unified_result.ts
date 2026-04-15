/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { parseDuration } from '@kbn/alerting-plugin/server';
import type { UnifiedExecutionResult } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { UnifiedExecutionStatus } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { invariant } from '../../../../../../../common/utils/invariant';
import { nsToMs, toOptionalInt } from './utils';

/**
 * Produces a UnifiedExecutionResult from an "execute"/"execute-backfill" event.
 *
 * This function is the single place that knows about the raw event structure.
 * If the underlying event source changes, only this function needs to be updated.
 */
export const mapEventToUnifiedResult = (event: IValidatedEvent): UnifiedExecutionResult => {
  return {
    execution_uuid: event?.kibana?.alert?.rule?.execution?.uuid ?? null,
    execution_start: extractExecutionStart(event),
    execution_duration_ms: extractDurationMs(event),
    schedule_delay_ms: extractScheduleDelayMs(event),
    backfill: extractBackfill(event),
    outcome: extractOutcome(event),
    metrics: extractMetrics(event),
  };
};

/**
 * Attempt to fall back to `@timestamp` when `event.start` is missing.
 * `event.start` – time when execution started.
 * `@timestamp` – time when event was indexed (right after execution finished).
 * We expect that `event.start` is always present, but since it's not required in the
 * Event Log schema, we are adding this just-in-case fallback.
 */
const extractExecutionStart = (event: IValidatedEvent): string => {
  const executionStart = event?.event?.start ?? event?.['@timestamp'];
  invariant(executionStart, 'Neither "event.start" nor "@timestamp" field is found');
  return executionStart;
};

const extractOutcome = (event: IValidatedEvent): UnifiedExecutionResult['outcome'] => {
  const outcomeStatus = UnifiedExecutionStatus.parse(event?.kibana?.alerting?.outcome);

  let message: string | null;
  switch (outcomeStatus) {
    case 'success':
      message = 'Rule executed successfully';
      break;
    case 'warning':
      message = event?.message ?? null;
      break;
    case 'failure':
      message = event?.error?.message ?? null;
      break;
    default:
      message = null;
  }

  return {
    status: outcomeStatus,
    message,
  };
};

const extractMetrics = (event: IValidatedEvent): UnifiedExecutionResult['metrics'] => {
  const metrics = event?.kibana?.alert?.rule?.execution?.metrics;

  return {
    total_search_duration_ms: toOptionalInt(metrics?.total_search_duration_ms),
    total_indexing_duration_ms: toOptionalInt(metrics?.total_indexing_duration_ms),
    execution_gap_duration_s: toOptionalInt(metrics?.execution_gap_duration_s),
    alerts_candidate_count: toOptionalInt(metrics?.alerts_candidate_count),
    alert_counts: metrics?.alert_counts
      ? {
          new: toOptionalInt(metrics.alert_counts.new),
        }
      : null,
    matched_indices_count: toOptionalInt(metrics?.matched_indices_count),
    frozen_indices_queried_count: toOptionalInt(metrics?.frozen_indices_queried_count),
  };
};

const extractDurationMs = (event: IValidatedEvent): number | null => nsToMs(event?.event?.duration);

const extractScheduleDelayMs = (event: IValidatedEvent): number | null =>
  nsToMs(event?.kibana?.task?.schedule_delay);

/**
 * Converts a backfill event field to a { from, to } time range.
 * kibana.alert.rule.execution.backfill.start is the later end of the range (to),
 * so `from` is derived by subtracting the interval.
 */
const extractBackfill = (event: IValidatedEvent): { from: string; to: string } | null => {
  const backfill = event?.kibana?.alert?.rule?.execution?.backfill;
  if (!backfill) {
    return null;
  }

  const { start, interval } = backfill;
  if (!start || !interval) {
    return null;
  }

  return {
    from: moment(start).subtract(parseDuration(interval), 'ms').toISOString(),
    to: start,
  };
};
