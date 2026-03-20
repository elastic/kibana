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
    status: mapAlertingOutcomeToStatus(outcome),
    metrics: extractMetrics(event),
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

const extractMetrics = (event: IValidatedEvent): UnifiedExecutionResult['metrics'] => {
  const execution = event?.kibana?.alert?.rule?.execution;
  const rawMetrics = execution?.metrics as Record<string, unknown> | undefined;

  return {
    duration_ms: extractDurationMs(event),
    candidate_alerts_count: toOptionalInt(rawMetrics?.candidate_alerts_count),
    scheduling_delay: extractSchedulingDelay(event),
    search_duration: toOptionalInt(rawMetrics?.total_search_duration_ms),
    backfill: extractBackfill(event),
    indices_found: toOptionalInt(rawMetrics?.indices_found),
    indexed_alerts_count: null,
    alerts_created_count: null,
    gap_duration: null,
    index_duration: null,
    matched_indices: null,
  };
};

/**
 * The Alerting Framework stores event.duration in nanoseconds.
 */
const extractDurationMs = (event: IValidatedEvent): number | null => {
  const durationNs = event?.event?.duration;
  if (typeof durationNs === 'number') {
    return Math.round(durationNs / ONE_MILLISECOND_AS_NANOSECONDS);
  }
  if (typeof durationNs === 'string') {
    return Math.round(Number(durationNs) / ONE_MILLISECOND_AS_NANOSECONDS);
  }
  return null;
};

const extractSchedulingDelay = (event: IValidatedEvent): number | null => {
  const kibanaTask = (event?.kibana as Record<string, unknown> | undefined)?.task as
    | Record<string, unknown>
    | undefined;
  return toOptionalInt(kibanaTask?.schedule_delay);
};

/**
 * Converts a backfill event field (start + interval) to a { from, to } time range.
 */
const extractBackfill = (
  event: IValidatedEvent
): { from: string; to: string } | null => {
  const execution = event?.kibana?.alert?.rule?.execution;
  const backfill = (execution as Record<string, unknown> | undefined)?.backfill as
    | Record<string, unknown>
    | undefined;

  if (!backfill) return null;

  const start = backfill.start as string | undefined;
  const interval = backfill.interval as string | undefined;
  if (!start || !interval) return null;

  const to = addIntervalToIso(start, interval);
  if (!to) return null;

  return { from: start, to };
};

/**
 * Adds a simple interval string (e.g. "5m", "1h", "1d", "1w") to an ISO date string.
 * Returns null if the interval cannot be parsed.
 */
const addIntervalToIso = (isoDate: string, interval: string): string | null => {
  const match = interval.match(/^(\d+)(ms|s|m|h|d|w)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  const ms = value * (unitMs[unit] ?? 0);
  if (ms === 0) return null;

  return new Date(new Date(isoDate).getTime() + ms).toISOString();
};

const toOptionalInt = (value: unknown): number | null => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
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
