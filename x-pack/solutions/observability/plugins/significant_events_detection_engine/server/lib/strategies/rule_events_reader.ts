/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '../errors';

/** The Alerting v2 event store. Every row a signal rule returns lands here. */
export const RULE_EVENTS_DATA_STREAM = '.rule-events';

const PAGE_SIZE = 5_000;
const PIT_KEEP_ALIVE = '1m';

/** One row an Alerting v2 signal rule wrote. */
export interface RuleEventRow {
  rule_id: string;
  /** When the rule run wrote it; later runs re-emit the same bucket with more complete data. */
  written_at: number;
  data: Record<string, unknown>;
}

/** Reads what the engine's (and Significant Events') signal rules wrote. */
/** Significant events the engine publishes are alerts too; they are never a customer's alert. */
const SIGNIFICANT_EVENTS_SOURCE = 'elastic.significant_events';
/** Latest events read to find which customer v2 alerts are active; one per series is kept. */
const MAX_ALERT_EVENTS = 5_000;
const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;

/** The latest event of one series of a customer's own Alerting v2 alert rule, while it is active. */
export interface ActiveRuleAlert {
  rule_id: string;
  group_hash: string;
  alert_id?: string;
  /** The rule's ES|QL row for this series: its group-by columns, such as `service.name`. */
  data: Record<string, unknown>;
  severity?: string;
  at: string;
}

/** How often one series of a v2 alert rule fired, by `<rule id>:<group hash>`. */
export interface RuleAlertHistory {
  episodes_last_hour: number;
  days_active_last_week: number;
}

export interface IRuleEventsReader {
  /**
   * Customer alerts in the shared storage: the latest event of every series of an Alerting v2
   * alert rule that is active, leaving out the significant events the engine publishes.
   */
  activeAlerts(params: { since: number; signal?: AbortSignal }): Promise<ActiveRuleAlert[]>;
  /** Episodes per series of the given v2 alert rules over the last week, today left out. */
  alertHistory(params: {
    ruleIds: string[];
    now: number;
    signal?: AbortSignal;
  }): Promise<Map<string, RuleAlertHistory>>;
  /**
   * Rows the given rules wrote since `since`, oldest first, up to `maxRows`. `truncated` says
   * the cap was hit; the caller then evaluates fewer buckets.
   */
  read(params: {
    ruleIds: string[];
    since: number;
    maxRows: number;
    signal?: AbortSignal;
  }): Promise<{ rows: RuleEventRow[]; truncated: boolean }>;
  /** When each rule last wrote, for rules that wrote since `since`. */
  latestWrites(params: {
    ruleIds: string[];
    since: number;
    signal?: AbortSignal;
  }): Promise<Map<string, number>>;
}

interface StoredRuleEvent {
  '@timestamp'?: string;
  rule?: { id?: string };
  data?: Record<string, unknown>;
  group_hash?: string;
  severity?: string;
  alert?: { id?: string; status?: string };
}

interface EpisodeBucket {
  key: string;
  first: { value: number | null };
  last: { value: number | null };
}

/**
 * Reads `.rule-events` as the Kibana system user, filtered to the space and to the rules asked
 * for. A point in time keeps paging consistent while rules keep writing.
 */
export function createRuleEventsReader({
  esClient,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
}): IRuleEventsReader {
  return {
    async activeAlerts({ since, signal }) {
      try {
        const response = await esClient.search<StoredRuleEvent>(
          {
            index: RULE_EVENTS_DATA_STREAM,
            size: MAX_ALERT_EVENTS,
            _source: ['@timestamp', 'rule.id', 'group_hash', 'data', 'severity', 'alert'],
            query: {
              bool: {
                filter: [
                  { term: { type: 'alert' } },
                  { term: { space_id: spaceId } },
                  { range: { '@timestamp': { gte: new Date(since).toISOString() } } },
                ],
                must_not: [{ term: { source: SIGNIFICANT_EVENTS_SOURCE } }],
              },
            },
            sort: [{ '@timestamp': 'desc' }],
          },
          { signal }
        );
        // Newest first: the first event of a series is its current state.
        const latest = response.hits.hits.reduce((bySeries, hit) => {
          const source = hit._source;
          const key = `${source?.rule?.id}:${source?.group_hash}`;
          if (source?.rule?.id && source.group_hash && !bySeries.has(key)) {
            bySeries.set(key, source);
          }
          return bySeries;
        }, new Map<string, StoredRuleEvent>());
        return [...latest.values()]
          .filter((source) => source.alert?.status === 'active')
          .map((source) => ({
            rule_id: source.rule!.id!,
            group_hash: source.group_hash!,
            alert_id: source.alert?.id,
            data: source.data ?? {},
            severity: source.severity,
            at: source['@timestamp'] ?? new Date(since).toISOString(),
          }));
      } catch (error) {
        if (isNotFoundError(error)) {
          return [];
        }
        throw error;
      }
    },

    async alertHistory({ ruleIds, now, signal }) {
      if (ruleIds.length === 0) {
        return new Map();
      }
      const today = Math.floor(now / DAY_MS) * DAY_MS;
      const weekStart = today - 7 * DAY_MS;
      try {
        const response = await esClient.search(
          {
            index: RULE_EVENTS_DATA_STREAM,
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { type: 'alert' } },
                  { term: { space_id: spaceId } },
                  { terms: { 'rule.id': ruleIds } },
                  { terms: { 'alert.status': ['active', 'recovering'] } },
                  { range: { '@timestamp': { gte: new Date(weekStart).toISOString() } } },
                ],
              },
            },
            aggs: {
              series: {
                multi_terms: {
                  terms: [{ field: 'rule.id' }, { field: 'group_hash' }],
                  size: 1_000,
                },
                aggs: {
                  episodes: {
                    terms: { field: 'alert.id', size: 1_000 },
                    aggs: {
                      first: { min: { field: '@timestamp' } },
                      last: { max: { field: '@timestamp' } },
                    },
                  },
                },
              },
            },
          },
          { signal }
        );
        const series =
          (
            response.aggregations?.series as
              | { buckets: Array<{ key: string[]; episodes: { buckets: EpisodeBucket[] } }> }
              | undefined
          )?.buckets ?? [];
        return new Map(
          series.map((bucket) => {
            const episodes = bucket.episodes.buckets.flatMap((episode) =>
              episode.first.value === null || episode.last.value === null
                ? []
                : [{ first: episode.first.value, last: episode.last.value }]
            );
            const days = new Set(
              episodes.flatMap(({ first, last }) => {
                const from = Math.max(weekStart, Math.floor(first / DAY_MS) * DAY_MS);
                const to = Math.min(last + 1, today);
                return to <= from
                  ? []
                  : Array.from(
                      { length: Math.ceil((to - from) / DAY_MS) },
                      (_, index) => from + index * DAY_MS
                    );
              })
            );
            return [
              `${bucket.key[0]}:${bucket.key[1]}`,
              {
                episodes_last_hour: episodes.filter(({ first }) => first >= now - HOUR_MS).length,
                days_active_last_week: days.size,
              },
            ] as const;
          })
        );
      } catch (error) {
        if (isNotFoundError(error)) {
          return new Map();
        }
        throw error;
      }
    },

    async latestWrites({ ruleIds, since, signal }) {
      if (ruleIds.length === 0) {
        return new Map();
      }
      try {
        const response = await esClient.search(
          {
            index: RULE_EVENTS_DATA_STREAM,
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { type: 'signal' } },
                  { term: { space_id: spaceId } },
                  { terms: { 'rule.id': ruleIds } },
                  { range: { '@timestamp': { gte: new Date(since).toISOString() } } },
                ],
              },
            },
            aggs: {
              rules: {
                terms: { field: 'rule.id', size: ruleIds.length },
                aggs: { latest: { max: { field: '@timestamp' } } },
              },
            },
          },
          { signal }
        );
        const buckets =
          (
            response.aggregations?.rules as
              | { buckets: Array<{ key: string; latest: { value: number | null } }> }
              | undefined
          )?.buckets ?? [];
        return new Map(
          buckets.flatMap((bucket) =>
            bucket.latest.value === null ? [] : [[bucket.key, bucket.latest.value] as const]
          )
        );
      } catch (error) {
        if (isNotFoundError(error)) {
          return new Map();
        }
        throw error;
      }
    },

    async read({ ruleIds, since, maxRows, signal }) {
      if (ruleIds.length === 0) {
        return { rows: [], truncated: false };
      }
      let pitId: string;
      try {
        pitId = (
          await esClient.openPointInTime(
            { index: RULE_EVENTS_DATA_STREAM, keep_alive: PIT_KEEP_ALIVE },
            { signal }
          )
        ).id;
      } catch (error) {
        // No rule has written anything yet in this cluster.
        if (isNotFoundError(error)) {
          return { rows: [], truncated: false };
        }
        throw error;
      }

      const rows: RuleEventRow[] = [];
      let searchAfter: estypes.SortResults | undefined;
      try {
        // Paged with a point in time: the result can be far larger than one response.
        while (rows.length < maxRows) {
          const response = await esClient.search<StoredRuleEvent>(
            {
              pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
              size: Math.min(PAGE_SIZE, maxRows - rows.length),
              _source: ['@timestamp', 'rule.id', 'data'],
              query: {
                bool: {
                  filter: [
                    { term: { type: 'signal' } },
                    { term: { space_id: spaceId } },
                    { terms: { 'rule.id': ruleIds } },
                    { range: { '@timestamp': { gte: new Date(since).toISOString() } } },
                  ],
                },
              },
              sort: [{ '@timestamp': 'asc' }, { _shard_doc: 'asc' }],
              search_after: searchAfter,
            },
            { signal }
          );
          pitId = response.pit_id ?? pitId;
          const hits = response.hits.hits;
          hits.forEach((hit) => {
            const source = hit._source;
            if (source?.rule?.id && source.data && source['@timestamp']) {
              rows.push({
                rule_id: source.rule.id,
                written_at: Date.parse(source['@timestamp']),
                data: source.data,
              });
            }
          });
          if (hits.length < PAGE_SIZE) {
            return { rows, truncated: false };
          }
          searchAfter = hits[hits.length - 1].sort;
        }
        return { rows, truncated: true };
      } finally {
        await esClient.closePointInTime({ id: pitId }).catch(() => undefined);
      }
    },
  };
}

/**
 * Keeps the latest row per key. Rules re-emit the buckets inside their lookback on every run,
 * and the latest run saw the most complete data.
 */
export function latestRowPerKey(
  rows: RuleEventRow[],
  keyOf: (row: RuleEventRow) => string | undefined
): Map<string, RuleEventRow> {
  return rows.reduce((latest, row) => {
    const key = keyOf(row);
    if (key === undefined) {
      return latest;
    }
    const existing = latest.get(key);
    if (!existing || existing.written_at <= row.written_at) {
      latest.set(key, row);
    }
    return latest;
  }, new Map<string, RuleEventRow>());
}
