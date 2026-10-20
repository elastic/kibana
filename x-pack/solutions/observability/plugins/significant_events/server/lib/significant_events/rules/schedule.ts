/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common/parse_duration';
import { CRITICAL_SEVERITY_THRESHOLD, type StreamQuery } from '@kbn/significant-events-schema';
import {
  METRIC_SERIES_EVERY,
  METRIC_SERIES_LOOKBACK,
  METRIC_SERIES_MAX_WRITE_DELAY,
} from './metric_series_contract';

const MS_PER_MINUTE = 60 * 1000;

/**
 * Detection analysis profile IDs (not Alerting execution cadences).
 * All MATCH rules execute on {@link METRIC_SERIES_EVERY} / {@link METRIC_SERIES_LOOKBACK}.
 * Severity only selects which change_point lookback / bucket interval to use.
 */
export type AnalysisProfileId = 'critical' | 'default';

export const CRITICAL_ANALYSIS_PROFILE: AnalysisProfileId = 'critical';
export const DEFAULT_ANALYSIS_PROFILE: AnalysisProfileId = 'default';

/**
 * Critical analysis defaults when the Detection workflow does not override
 * lookback / bucketInterval. ≥22 buckets at 1m keeps change_point above its floor.
 */
export const CRITICAL_ANALYSIS_LOOKBACK_MINUTES = 40;
export const CRITICAL_ANALYSIS_BUCKET_INTERVAL = '1m';

/**
 * Default (non-critical) analysis profile: coarser 5m outer buckets over 125m
 * → 25 change_point values (≥22 floor). Configured workflow inputs do not
 * override this profile (see preserve-profiles contract).
 */
export const DEFAULT_ANALYSIS_LOOKBACK_MINUTES = 125;
export const DEFAULT_ANALYSIS_BUCKET_INTERVAL = '5m';

export interface AnalysisProfileConfig {
  profile: AnalysisProfileId;
  bucketInterval: string;
  lookback: string;
  lookbackMinutes: number;
}

export function isCriticalSeverity(query: Pick<StreamQuery, 'severity_score'>): boolean {
  return (query.severity_score ?? 0) >= CRITICAL_SEVERITY_THRESHOLD;
}

/** Severity → analysis profile. Not the Alerting v2 `schedule.every`. */
export function analysisProfileForQuery(
  query: Pick<StreamQuery, 'severity_score'>
): AnalysisProfileId {
  return isCriticalSeverity(query) ? CRITICAL_ANALYSIS_PROFILE : DEFAULT_ANALYSIS_PROFILE;
}

/** Execution schedule for all MATCH metric-series rules. */
export function getMetricSeriesRuleSchedule(): { every: string; lookback: string } {
  return {
    every: METRIC_SERIES_EVERY,
    lookback: METRIC_SERIES_LOOKBACK,
  };
}

export function getDurationMinutes(duration: string): number {
  const minutes = parseDuration(duration) / MS_PER_MINUTE;
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(`Duration "${duration}" must resolve to whole positive minutes`);
  }
  return minutes;
}

/**
 * Parse Detection workflow lookback date-math (`now-40m`) into minutes.
 */
export function parseLookbackMinutes(lookback: string): number {
  const match = /^now-(\d+)m$/i.exec(lookback.trim());
  if (!match) {
    throw new Error(`Detection lookback "${lookback}" must be ES date math of the form now-<N>m`);
  }
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(`Detection lookback "${lookback}" must use a positive minute count`);
  }
  return minutes;
}

/**
 * Detection change_point analysis profile by severity.
 *
 * Critical defaults (40m / 1m) are overridden at scan time by workflow inputs.
 * Default stays fixed at 125m / 5m so non-critical rules keep a stable density
 * contract independent of scheduled tuning.
 */
export function getAnalysisProfileConfig(
  query: Pick<StreamQuery, 'severity_score'>
): AnalysisProfileConfig {
  if (isCriticalSeverity(query)) {
    return {
      profile: CRITICAL_ANALYSIS_PROFILE,
      bucketInterval: CRITICAL_ANALYSIS_BUCKET_INTERVAL,
      lookback: `now-${CRITICAL_ANALYSIS_LOOKBACK_MINUTES}m`,
      lookbackMinutes: CRITICAL_ANALYSIS_LOOKBACK_MINUTES,
    };
  }

  return {
    profile: DEFAULT_ANALYSIS_PROFILE,
    bucketInterval: DEFAULT_ANALYSIS_BUCKET_INTERVAL,
    lookback: `now-${DEFAULT_ANALYSIS_LOOKBACK_MINUTES}m`,
    lookbackMinutes: DEFAULT_ANALYSIS_LOOKBACK_MINUTES,
  };
}

/**
 * Write-time `@timestamp` lower bound that covers every source minute in an
 * analysis window of `lookbackMinutes` ending at `now - MAX_WRITE_DELAY`.
 * Source min is `now - (lookbackMinutes + writeDelay)`; write-time docs for
 * that edge can land around the same horizon.
 *
 * `bucketIntervalMinutes` widens the bound by one analysis bucket. ES rounds a
 * `date_histogram`'s `hard_bounds.min` *down* to `fixed_interval`, so the window
 * really starts up to `bucketIntervalMinutes - 1` earlier than the requested
 * instant. Those extra source minutes were written before an un-widened prune
 * begins, so pruning at the unrounded instant drops them and leaves the oldest
 * bucket holding a partial sum — a dip at index 0 on every scan.
 */
export function getAnalysisWriteTimeLookback(
  lookbackMinutes: number,
  bucketIntervalMinutes: number
): string {
  const writeDelayMinutes = getDurationMinutes(METRIC_SERIES_MAX_WRITE_DELAY);
  return `now-${lookbackMinutes + writeDelayMinutes + bucketIntervalMinutes}m`;
}

/**
 * Idle-gate lookback: earliest write-time bound across the configured critical
 * profile and the fixed default profile, so a space with only default-profile
 * activity in the wider window is not cancelled early.
 *
 * Padded with the default profile's bucket interval to keep the invariant that
 * the gate is never narrower than a scan window it guards; otherwise a space
 * whose only activity sits in the interval-rounding margin would be cancelled
 * before the scan that would have found it.
 */
export function getIdleGateLookback(criticalLookback: string): string {
  const criticalMinutes = parseLookbackMinutes(criticalLookback);
  const widestMinutes = Math.max(criticalMinutes, DEFAULT_ANALYSIS_LOOKBACK_MINUTES);
  return getAnalysisWriteTimeLookback(
    widestMinutes,
    getDurationMinutes(DEFAULT_ANALYSIS_BUCKET_INTERVAL)
  );
}
