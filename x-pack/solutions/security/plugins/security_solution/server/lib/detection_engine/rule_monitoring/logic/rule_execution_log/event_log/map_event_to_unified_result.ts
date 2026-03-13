/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { UnifiedExecutionResult } from '../../../../../../../common/api/detection_engine/rule_monitoring';

const ONE_MILLISECOND_AS_NANOSECONDS = 1_000_000;

/**
 * Maps a raw event log event to a UnifiedExecutionResult.
 *
 * This function is the single place that knows about the raw event structure.
 * If the underlying event source changes, only this function needs to be updated.
 */
export const mapEventToUnifiedResult = (event: IValidatedEvent): UnifiedExecutionResult => {
  const execution = event?.kibana?.alert?.rule?.execution;
  const alertingOutcome = (event?.kibana as Record<string, unknown> | undefined)?.alerting as
    | Record<string, unknown>
    | undefined;
  const outcome = alertingOutcome?.outcome as string | undefined;

  return {
    execution_uuid: execution?.uuid ?? '',
    timestamp: event?.['@timestamp'] ?? '',
    execution_duration_ms: extractDurationMs(event),
    status: mapAlertingOutcomeToStatus(outcome),
    metrics: (execution?.metrics as Record<string, unknown>) ?? {},
    errors: extractErrors(event, outcome),
    warnings: extractWarnings(event, outcome),
  };
};

const mapAlertingOutcomeToStatus = (outcome?: string): string => {
  switch (outcome) {
    case 'success':
      return 'succeeded';
    case 'warning':
      return 'warning';
    case 'failure':
      return 'failed';
    default:
      return outcome ?? 'unknown';
  }
};

/**
 * The Alerting Framework stores event.duration in nanoseconds.
 */
const extractDurationMs = (event: IValidatedEvent): number => {
  const durationNs = event?.event?.duration;
  if (typeof durationNs === 'number') {
    return Math.round(durationNs / ONE_MILLISECOND_AS_NANOSECONDS);
  }
  if (typeof durationNs === 'string') {
    return Math.round(Number(durationNs) / ONE_MILLISECOND_AS_NANOSECONDS);
  }
  return 0;
};

/**
 * Extracts errors from error.message when kibana.alerting.outcome is 'failure'.
 * The Alerting Framework stores a single error string, not an array.
 */
const extractErrors = (
  event: IValidatedEvent,
  alertingOutcome?: string
): Array<{ message: string }> => {
  if (alertingOutcome !== 'failure') {
    return [];
  }
  const errorMessage = event?.error?.message;
  if (errorMessage) {
    return [{ message: errorMessage }];
  }
  return [];
};

/**
 * Extracts warnings from top-level message when kibana.alerting.outcome is 'warning'.
 */
const extractWarnings = (
  event: IValidatedEvent,
  alertingOutcome?: string
): Array<{ message: string }> => {
  if (alertingOutcome !== 'warning') {
    return [];
  }
  const warningMessage = event?.message;
  if (warningMessage) {
    return [{ message: warningMessage }];
  }
  return [];
};
