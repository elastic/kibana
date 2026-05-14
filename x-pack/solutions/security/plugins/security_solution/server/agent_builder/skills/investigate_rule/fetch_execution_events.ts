/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const EVENT_LOG_INDEX = '.kibana-event-log-*' as const;

/**
 * A single execution event record returned from the event log.
 *
 * `status` uses the tool output vocabulary (`succeeded | failed | partial failure`)
 * rather than the alerting vocabulary (`success | warning | failure`).
 */
export interface ExecutionEventRecord {
  timestamp: string;
  status: 'succeeded' | 'failed' | 'partial failure';
  duration_ms: number | null;
  gap_duration_s: number | null;
  error_message?: string;
}

/**
 * Aggregated performance metrics across all executions in a time window.
 * Returned by `get_rule_execution_metrics` (Task 7).
 */
export interface ExecutionMetrics {
  avg_duration_ms: number | null;
  p95_duration_ms: number | null;
  max_duration_ms: number | null;
  total_search_hits: number;
  execution_count: number;
  gap_count: number;
}

type AlertingOutcome = 'success' | 'warning' | 'failure';

const mapOutcomeToStatus = (outcome: string): ExecutionEventRecord['status'] => {
  switch (outcome as AlertingOutcome) {
    case 'success':
      return 'succeeded';
    case 'warning':
      return 'partial failure';
    case 'failure':
      return 'failed';
    default:
      return 'failed';
  }
};

const NS_PER_MS = 1_000_000;

const nsToMs = (value: unknown): number | null => {
  if (typeof value === 'number') return Math.round(value / NS_PER_MS);
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n / NS_PER_MS) : null;
  }
  return null;
};

const toOptionalNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
};

export interface FetchExecutionEventsParams {
  ruleId: string;
  spaceId: string;
  timeWindowHours: number;
  size?: number;
}

export interface FetchExecutionEventsResult {
  records: ExecutionEventRecord[];
  total: number;
}

/**
 * Shared filter used by both fetchExecutionEvents and fetchExecutionMetrics.
 * Extracted to avoid duplicating the query logic.
 */
const buildExecutionEventFilter = (ruleId: string, spaceId: string, timeWindowHours: number) => ({
  bool: {
    filter: [
      { term: { 'event.provider': 'alerting' } },
      { terms: { 'event.action': ['execute', 'execute-backfill'] } },
      { exists: { field: 'kibana.alerting.outcome' } },
      {
        nested: {
          path: 'kibana.saved_objects',
          query: {
            bool: {
              filter: [
                { term: { 'kibana.saved_objects.type': 'alert' } },
                { term: { 'kibana.saved_objects.id': ruleId } },
              ],
            },
          },
        },
      },
      { term: { 'kibana.space_ids': spaceId } },
      { range: { '@timestamp': { gte: `now-${timeWindowHours}h` } } },
    ],
  },
});

/**
 * Queries the event log for execution events for a given rule.
 *
 * Both `get_rule_execution_logs` (Task 3) and `get_rule_execution_metrics` (Task 7) call this
 * shared filter builder so the underlying query logic lives in one place.
 */
export const fetchExecutionEvents = async (
  esClient: IScopedClusterClient,
  { ruleId, spaceId, timeWindowHours, size = 100 }: FetchExecutionEventsParams
): Promise<FetchExecutionEventsResult> => {
  interface EventLogSource {
    '@timestamp'?: string;
    event?: {
      start?: string;
      duration?: number | string;
    };
    kibana?: {
      alerting?: { outcome?: string };
      alert?: {
        rule?: {
          execution?: {
            metrics?: {
              execution_gap_duration_s?: number | string;
            };
          };
        };
      };
    };
    error?: { message?: string };
    message?: string;
  }

  const searchResult = await esClient.asInternalUser.search<EventLogSource>({
    index: EVENT_LOG_INDEX,
    size,
    query: buildExecutionEventFilter(ruleId, spaceId, timeWindowHours),
    sort: [{ '@timestamp': 'desc' }],
    _source: [
      '@timestamp',
      'event.start',
      'event.duration',
      'kibana.alerting.outcome',
      'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
      'error.message',
      'message',
    ],
    ignore_unavailable: true,
  });

  const total =
    typeof searchResult.hits.total === 'number'
      ? searchResult.hits.total
      : searchResult.hits.total?.value ?? 0;

  const records: ExecutionEventRecord[] = searchResult.hits.hits.map((hit) => {
    const src = hit._source;
    const timestamp: string = src?.event?.start ?? src?.['@timestamp'] ?? '';
    const outcome: string = src?.kibana?.alerting?.outcome ?? '';
    const durationNs = src?.event?.duration;
    const gapSeconds = src?.kibana?.alert?.rule?.execution?.metrics?.execution_gap_duration_s;
    const errorMsg = src?.error?.message;

    const record: ExecutionEventRecord = {
      timestamp,
      status: mapOutcomeToStatus(outcome),
      duration_ms: nsToMs(durationNs),
      gap_duration_s: toOptionalNumber(gapSeconds),
    };

    if (record.status === 'failed' && errorMsg) {
      record.error_message = errorMsg;
    } else if (record.status === 'partial failure' && (src?.message ?? errorMsg)) {
      record.error_message = src?.message ?? errorMsg;
    }

    return record;
  });

  return { records, total };
};

/**
 * Runs a single aggregation query against the event log to compute performance
 * metrics for a rule over a time window.
 *
 * Used by `get_rule_execution_metrics` (Task 7). Shares the filter builder with
 * `fetchExecutionEvents` so the API-call logic is not duplicated.
 */
export const fetchExecutionMetrics = async (
  esClient: IScopedClusterClient,
  { ruleId, spaceId, timeWindowHours }: Omit<FetchExecutionEventsParams, 'size'>
): Promise<ExecutionMetrics> => {
  const searchResult = await esClient.asInternalUser.search({
    index: EVENT_LOG_INDEX,
    size: 0,
    query: buildExecutionEventFilter(ruleId, spaceId, timeWindowHours),
    aggs: {
      execution_count: { value_count: { field: 'event.start' } },
      duration_stats: { extended_stats: { field: 'event.duration' } },
      duration_p95: {
        percentiles: { field: 'event.duration', percents: [95] },
      },
      total_search_hits: {
        sum: { field: 'kibana.alert.rule.execution.metrics.alerts_candidate_count' },
      },
      gap_count: {
        filter: {
          range: {
            'kibana.alert.rule.execution.metrics.execution_gap_duration_s': { gt: 0 },
          },
        },
      },
    },
    ignore_unavailable: true,
  });

  const aggs = searchResult.aggregations as
    | Record<
        string,
        {
          value?: number | null;
          count?: number;
          avg?: number | null;
          max?: number | null;
          values?: Record<string, number | null>;
          doc_count?: number;
        }
      >
    | undefined;

  const executionCount = (aggs?.execution_count?.value ?? 0) as number;
  const avgNs = aggs?.duration_stats?.avg ?? null;
  const maxNs = aggs?.duration_stats?.max ?? null;
  const p95Ns = (aggs?.duration_p95?.values?.['95.0'] as number | null | undefined) ?? null;
  const totalSearchHits = Math.round((aggs?.total_search_hits?.value as number | null) ?? 0);
  const gapCount = (aggs?.gap_count?.doc_count ?? 0) as number;

  return {
    avg_duration_ms: nsToMs(avgNs),
    p95_duration_ms: nsToMs(p95Ns),
    max_duration_ms: nsToMs(maxNs),
    total_search_hits: totalSearchHits,
    execution_count: executionCount,
    gap_count: gapCount,
  };
};
