/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { RULE_SEARCH_INDEX, getRuleSearchModels } from './rule_search_index';
import { searchRelevantRuleIds } from './rule_search_query';

export { syncRuleSearchIndex } from './rule_search_sync';

export type SemanticSearchResult =
  | { mode: 'semantic'; ruleIds: string[] }
  | { mode: 'legacy'; reason: 'no_model' | 'not_indexed' | 'error' };

/** The table and its facet counts ask for the same text right after each other. */
const CACHE_TTL_MS = 30_000;
const CACHE_SIZE = 100;
const cache = new Map<string, { at: number; ruleIds: string[] }>();
/** The same text from the table and its facet counts at once: one search, not two. */
const inFlight = new Map<string, Promise<SemanticSearchResult>>();

/** The rule search index workflow of the space has run at least once. */
const isSpaceIndexed = async (esClient: ElasticsearchClient, spaceId: string) => {
  const result = await esClient.search({
    index: RULE_SEARCH_INDEX,
    ignore_unavailable: true,
    size: 0,
    terminate_after: 1,
    track_total_hits: true,
    query: { term: { space_id: spaceId } },
  });
  const total = result.hits.total;
  return (typeof total === 'number' ? total : total?.value ?? 0) > 0;
};

/**
 * The relevant rules for a text, best first, as saved object ids; or why the search falls back
 * to `legacy` (no model on this cluster, the space is not indexed because its rule search index
 * workflow is off or has not run yet, or an error). Search only reads the index, with the
 * internal user; only ids leave this function.
 */
const runSemanticSearch = async ({
  esClient,
  spaceId,
  term,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  term: string;
  logger: Logger;
}): Promise<SemanticSearchResult> => {
  const key = `${spaceId}\u0000${term}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { mode: 'semantic', ruleIds: cached.ruleIds };
  }
  try {
    const models = await getRuleSearchModels(esClient);
    if (!models.embedding) {
      return { mode: 'legacy', reason: 'no_model' };
    }
    if (!(await isSpaceIndexed(esClient, spaceId))) {
      return { mode: 'legacy', reason: 'not_indexed' };
    }
    const ranked = await searchRelevantRuleIds({ esClient, spaceId, term, models });
    const ruleIds = ranked.map(({ soId }) => soId);
    const oldest = cache.keys().next().value;
    if (cache.size >= CACHE_SIZE && oldest !== undefined) cache.delete(oldest);
    cache.set(key, { at: Date.now(), ruleIds });
    return { mode: 'semantic', ruleIds };
  } catch (error) {
    logger.error(`Semantic rule search failed, using the keyword search: ${error.message}`);
    return { mode: 'legacy', reason: 'error' };
  }
};

export const resolveSemanticSearch = (params: {
  esClient: ElasticsearchClient;
  spaceId: string;
  term: string;
  logger: Logger;
}): Promise<SemanticSearchResult> => {
  const key = `${params.spaceId}\u0000${params.term}`;
  const running = inFlight.get(key);
  if (running) return running;
  const search = runSemanticSearch(params).finally(() => inFlight.delete(key));
  inFlight.set(key, search);
  return search;
};
