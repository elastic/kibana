/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { getRuleSearchModels } from './rule_search_index';
import { prepareRuleSearchIndex } from './rule_search_sync';
import { searchRelevantRuleIds } from './rule_search_query';

export { syncRuleSearchIndex } from './rule_search_sync';

export type SemanticSearchResult =
  | { mode: 'semantic'; ruleIds: string[] }
  | { mode: 'legacy'; reason: 'exact' | 'no_model' | 'indexing' | 'error' };

/**
 * Text that asks for an exact match stays on the keyword search, which finds all matches:
 * quoted text, MITRE ATT&CK ids (T1003, T1003.001, TA0006) and rule ids. This looks at the shape
 * of the text, not at words, so it does not depend on the language.
 */
const EXACT_TEXT =
  /^(".+"|(TA|T)\d{4}(\.\d{3})?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** The table and its facet counts ask for the same text right after each other. */
const CACHE_TTL_MS = 30_000;
const CACHE_SIZE = 100;
const cache = new Map<string, { at: number; ruleIds: string[] }>();
/** The same text from the table and its facet counts at once: one search, not two. */
const inFlight = new Map<string, Promise<SemanticSearchResult>>();

/**
 * The relevant rules for a text, best first, as saved object ids; or why the search falls back
 * to `legacy` (no model on this cluster, the space is being indexed for the first time, or an
 * error). The index is read with the internal user; only ids leave this function.
 */
const runSemanticSearch = async ({
  rulesClient,
  esClient,
  spaceId,
  term,
  logger,
}: {
  rulesClient: RulesClient;
  esClient: ElasticsearchClient;
  spaceId: string;
  term: string;
  logger: Logger;
}): Promise<SemanticSearchResult> => {
  if (EXACT_TEXT.test(term)) {
    return { mode: 'legacy', reason: 'exact' };
  }
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
    const readiness = await prepareRuleSearchIndex({ rulesClient, esClient, spaceId, logger });
    if (readiness === 'indexing') {
      return { mode: 'legacy', reason: 'indexing' };
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
  rulesClient: RulesClient;
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
