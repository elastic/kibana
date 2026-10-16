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
export interface IRuleEventsReader {
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
}

interface StoredRuleEvent {
  '@timestamp'?: string;
  rule?: { id?: string };
  data?: Record<string, unknown>;
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
