/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { findRules } from '../find_rules';
import { RULE_SEARCH_INDEX, ensureRuleSearchIndex } from './rule_search_index';
import {
  RULE_CARD_VERSION,
  buildRuleSearchDocument,
  ruleSearchDocumentId,
} from './rule_search_document';

const BULK_SIZE = 100;
const MAX_RULES = 10_000;

export interface RuleSearchSyncResult {
  indexed: number;
  deleted: number;
  failed: number;
  total: number;
  tookMs: number;
}

/** One sync per space at a time (a scheduled and a manual run can overlap). */
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

  // One request, not pages: RulesClient pages have no tiebreaker, and rules that run rewrite
  // their saved objects meanwhile, so pages skip some rules and repeat others.
  const current = await findRules({
    rulesClient,
    filter: undefined,
    fields: ['updatedAt'],
    sortField: undefined,
    sortOrder: undefined,
    page: 1,
    perPage: MAX_RULES,
  });
  const seen = new Set(current.data.map((rule) => rule.id));
  const changedIds = current.data
    .filter((rule) => indexed.get(rule.id) !== new Date(rule.updatedAt).toISOString())
    .map((rule) => rule.id);

  let embedded = 0;
  let failed = 0;
  for (let i = 0; i < changedIds.length; i += BULK_SIZE) {
    const ruleIds = changedIds.slice(i, i + BULK_SIZE);
    const { data: rules } = await findRules({
      rulesClient,
      filter: undefined,
      sortField: undefined,
      sortOrder: undefined,
      page: 1,
      perPage: ruleIds.length,
      ruleIds,
    });
    if (rules.length) {
      const response = await esClient.bulk({
        operations: rules.flatMap((rule) => [
          { index: { _index: RULE_SEARCH_INDEX, _id: ruleSearchDocumentId(spaceId, rule.id) } },
          buildRuleSearchDocument(spaceId, rule),
        ]),
      });
      const batchFailed = response.items.filter((item) => item.index?.error).length;
      embedded += rules.length - batchFailed;
      failed += batchFailed;
    }
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
    indexed: embedded,
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
