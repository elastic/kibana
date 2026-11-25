/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  AggregationsFilterAggregate,
  AggregationsMaxAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import { findRules } from '../find_rules';
import { RULE_SEARCH_INDEX, ensureRuleSearchIndex } from './rule_search_index';
import {
  RULE_CARD_VERSION,
  buildRuleSearchDocument,
  ruleSearchDocumentId,
} from './rule_search_document';

const PAGE_SIZE = 1000;
const BULK_SIZE = 100;
const MAX_RULES = 10_000;

export interface RuleSearchSyncResult {
  indexed: number;
  deleted: number;
  failed: number;
  total: number;
  tookMs: number;
}

/** One sync per space at a time; searches meanwhile use what is indexed. */
const running = new Map<string, Promise<RuleSearchSyncResult>>();

interface SyncParams {
  rulesClient: RulesClient;
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
}

const indexedState = async (esClient: ElasticsearchClient, spaceId: string) => {
  const result = await esClient.search<{ so_id: string; updated_at: string; card_version: string }>(
    {
      index: RULE_SEARCH_INDEX,
      size: MAX_RULES,
      _source: ['so_id', 'updated_at', 'card_version'],
      query: { term: { space_id: spaceId } },
    }
  );
  // A document with an older card format counts as changed.
  return new Map(
    result.hits.hits.flatMap((hit) =>
      hit._source
        ? [
            [
              hit._source.so_id,
              hit._source.card_version === RULE_CARD_VERSION ? hit._source.updated_at : '',
            ],
          ]
        : []
    )
  );
};

/**
 * Brings the space's documents up to date with the rules the user can read: new and changed
 * rules are (re)indexed, which embeds their card; documents of deleted rules are removed.
 * Rules are read through RulesClient only.
 */
const syncSpace = async ({ rulesClient, esClient, spaceId, logger }: SyncParams) => {
  const started = Date.now();
  await ensureRuleSearchIndex(esClient, logger);
  const indexed = await indexedState(esClient, spaceId);
  const seen = new Set<string>();
  const changed = [];

  for (let page = 1; page * PAGE_SIZE <= MAX_RULES; page++) {
    const result = await findRules({
      rulesClient,
      filter: undefined,
      sortField: undefined,
      sortOrder: undefined,
      page,
      perPage: PAGE_SIZE,
    });
    for (const rule of result.data) {
      seen.add(rule.id);
      if (indexed.get(rule.id) !== new Date(rule.updatedAt).toISOString()) {
        changed.push(buildRuleSearchDocument(spaceId, rule));
      }
    }
    if (page * PAGE_SIZE >= result.total) break;
  }

  let failed = 0;
  for (let i = 0; i < changed.length; i += BULK_SIZE) {
    const response = await esClient.bulk({
      operations: changed
        .slice(i, i + BULK_SIZE)
        .flatMap((doc) => [
          { index: { _index: RULE_SEARCH_INDEX, _id: ruleSearchDocumentId(spaceId, doc.so_id) } },
          doc,
        ]),
    });
    failed += response.items.filter((item) => item.index?.error).length;
  }

  const gone = [...indexed.keys()].filter((soId) => !seen.has(soId));
  if (gone.length) {
    await esClient.bulk({
      operations: gone.map((soId) => ({
        delete: { _index: RULE_SEARCH_INDEX, _id: ruleSearchDocumentId(spaceId, soId) },
      })),
    });
  }
  await esClient.indices.refresh({ index: RULE_SEARCH_INDEX });

  const summary = {
    indexed: changed.length - failed,
    deleted: gone.length,
    failed,
    total: seen.size,
    tookMs: Date.now() - started,
  };
  if (failed) {
    logger.warn(`Rule search index: ${failed} rules of space ${spaceId} were not embedded`);
  }
  logger.debug(`Rule search index synced for space ${spaceId}: ${JSON.stringify(summary)}`);
  return summary;
};

export const syncRuleSearchIndex = (params: SyncParams): Promise<RuleSearchSyncResult> => {
  const current = running.get(params.spaceId);
  if (current) return current;
  const sync = syncSpace(params).finally(() => running.delete(params.spaceId));
  running.set(params.spaceId, sync);
  return sync;
};

export type RuleSearchReadiness = 'ready' | 'indexing';

/**
 * Before a search: compare the rule count and the last update with the index. Up to date:
 * ready. Changed: sync in the background and search what is indexed. Nothing indexed yet: sync
 * in the background and let this search fall back to `legacy`.
 */
export const prepareRuleSearchIndex = async (params: SyncParams): Promise<RuleSearchReadiness> => {
  const { rulesClient, esClient, spaceId, logger } = params;
  await ensureRuleSearchIndex(esClient, logger);
  const [latest, indexed] = await Promise.all([
    findRules({
      rulesClient,
      filter: undefined,
      sortField: 'updated_at',
      sortOrder: 'desc',
      page: 1,
      perPage: 1,
    }),
    esClient.search<
      unknown,
      { latest: AggregationsMaxAggregate; old_cards: AggregationsFilterAggregate }
    >({
      index: RULE_SEARCH_INDEX,
      size: 0,
      track_total_hits: true,
      query: { term: { space_id: spaceId } },
      aggs: {
        latest: { max: { field: 'updated_at' } },
        old_cards: {
          filter: { bool: { must_not: { term: { card_version: RULE_CARD_VERSION } } } },
        },
      },
    }),
  ]);
  const indexedTotal =
    typeof indexed.hits.total === 'number' ? indexed.hits.total : indexed.hits.total?.value ?? 0;
  const indexedLatest = indexed.aggregations?.latest.value ?? null;
  const rulesLatest = latest.data[0] ? new Date(latest.data[0].updatedAt).getTime() : null;
  const upToDate =
    indexedTotal === latest.total &&
    indexedLatest === rulesLatest &&
    (indexed.aggregations?.old_cards.doc_count ?? 0) === 0;

  if (!upToDate || running.has(spaceId)) {
    syncRuleSearchIndex(params).catch((error) =>
      logger.error(`Rule search index sync failed for space ${spaceId}: ${error.message}`)
    );
  }
  return indexedTotal > 0 ? 'ready' : 'indexing';
};
