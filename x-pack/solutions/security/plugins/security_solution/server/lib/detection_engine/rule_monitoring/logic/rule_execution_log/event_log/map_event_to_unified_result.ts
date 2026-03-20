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
    execution_start: event?.event?.start ?? '',
    execution_duration_ms: extractDurationMs(event),
    schedule_delay_ms: extractScheduleDelayMs(event),
    backfill: extractBackfill(event),
    outcome: {
      status: outcome ?? 'unknown',
      message: event?.message ?? null,
    },
    metrics: extractMetrics(event),
  };
};

const extractMetrics = (event: IValidatedEvent): UnifiedExecutionResult['metrics'] => {
  const execution = event?.kibana?.alert?.rule?.execution;
  const rawMetrics = execution?.metrics as Record<string, unknown> | undefined;
  const rawAlertCounts = rawMetrics?.alert_counts as Record<string, unknown> | undefined;

  return {
    total_search_duration_ms: toOptionalInt(rawMetrics?.total_search_duration_ms),
    total_indexing_duration_ms: toOptionalInt(rawMetrics?.total_indexing_duration_ms),
    execution_gap_duration_s: toOptionalInt(rawMetrics?.execution_gap_duration_s),
    alerts_candidate_count: toOptionalInt(rawMetrics?.alerts_candidate_count),
    alert_counts: rawAlertCounts
      ? {
          new: toOptionalInt(rawAlertCounts.new),
        }
      : null,
    matched_indices_count: toOptionalInt(rawMetrics?.matched_indices_count),
    frozen_indices_queried_count: toOptionalInt(rawMetrics?.frozen_indices_queried_count),
    index_duration_ms: null,
  };
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
 * The Alerting Framework stores kibana.task.schedule_delay in nanoseconds.
 */
const extractScheduleDelayMs = (event: IValidatedEvent): number | null => {
  const kibanaTask = (event?.kibana as Record<string, unknown> | undefined)?.task as
    | Record<string, unknown>
    | undefined;
  const delayNs = kibanaTask?.schedule_delay;
  if (typeof delayNs === 'number') {
    return Math.round(delayNs / ONE_MILLISECOND_AS_NANOSECONDS);
  }
  if (typeof delayNs === 'string') {
    return Math.round(Number(delayNs) / ONE_MILLISECOND_AS_NANOSECONDS);
  }
  return null;
};

/**
 * Converts a backfill event field (start + interval) to a { from, to } time range.
 */
const extractBackfill = (event: IValidatedEvent): { from: string; to: string } | null => {
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
