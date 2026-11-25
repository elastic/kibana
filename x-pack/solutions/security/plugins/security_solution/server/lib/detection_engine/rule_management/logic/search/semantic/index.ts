/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { RULE_SEARCH_INDEX, getRuleSearchModels } from './rule_search_index';
import { searchRelevantRuleIds } from './rule_search_query';

export { syncRuleSearchIndex } from './rule_search_sync';

/**
 * Why a search by meaning ran as the keyword search: "Use AI features" is off in the space, the
 * cluster lacks the embedding or the rerank model, Workflows is not available, the admin has not
 * turned the rule search index workflow on, its first run has not finished, or the search failed
 * or timed out.
 */
export type SemanticSearchFallbackReason =
  | 'ai_off'
  | 'no_model'
  | 'no_workflows'
  | 'off'
  | 'not_indexed'
  | 'error';

export type SemanticSearchResult =
  | { mode: 'semantic'; ruleIds: string[] }
  | { mode: 'legacy'; reason: SemanticSearchFallbackReason };

/** The values that "Use AI features: off" writes, depending on which settings page wrote them. */
const AI_OFF_CONNECTORS = new Set(['NO_DEFAULT_MODEL', 'NO_DEFAULT_CONNECTOR']);

/** "Use AI features" of the space (Stack Management, GenAI settings). */
export const areAiFeaturesOn = async (uiSettings: IUiSettingsClient): Promise<boolean> => {
  const [connector, connectorOnly] = await Promise.all([
    uiSettings.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR).catch(() => ''),
    uiSettings.get<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY).catch(() => false),
  ]);
  return !(AI_OFF_CONNECTORS.has(connector) && connectorOnly === true);
};

/** Search by meaning needs both models: without the reranker there is no score to cut on. */
const hasRuleSearchModels = async (esClient: ElasticsearchClient) => {
  const models = await getRuleSearchModels(esClient);
  return models.embedding && models.rerank;
};

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

interface RuleSearchContext {
  esClient: ElasticsearchClient;
  uiSettings: IUiSettingsClient;
  spaceId: string;
  /** Whether the admin turned the workflow on; `undefined` when Workflows is not available. */
  isWorkflowEnabled: (spaceId: string) => Promise<boolean | undefined>;
}

/**
 * What the rules page offers in the space: `unavailable` (only the keyword search: AI features
 * off, no models or no Workflows), `off` (the admin has not turned the rule search index workflow
 * on), `indexing` (on, first run not finished) or `ready`.
 */
export type RuleSearchStatus = 'unavailable' | 'off' | 'indexing' | 'ready';

const checkRuleSearch = async ({
  esClient,
  uiSettings,
  spaceId,
  isWorkflowEnabled,
}: RuleSearchContext): Promise<
  | { status: 'ready' }
  | { status: Exclude<RuleSearchStatus, 'ready'>; reason: SemanticSearchFallbackReason }
> => {
  if (!(await areAiFeaturesOn(uiSettings))) {
    return { status: 'unavailable', reason: 'ai_off' };
  }
  if (!(await hasRuleSearchModels(esClient))) {
    return { status: 'unavailable', reason: 'no_model' };
  }
  const enabled = await isWorkflowEnabled(spaceId);
  if (enabled === undefined) {
    return { status: 'unavailable', reason: 'no_workflows' };
  }
  if (!enabled) {
    return { status: 'off', reason: 'off' };
  }
  if (!(await isSpaceIndexed(esClient, spaceId))) {
    return { status: 'indexing', reason: 'not_indexed' };
  }
  return { status: 'ready' };
};

export const getRuleSearchStatus = async (context: RuleSearchContext) =>
  (await checkRuleSearch(context)).status;

type SemanticSearchParams = RuleSearchContext & { term: string; logger: Logger };

/**
 * The relevant rules for a text, best first, as saved object ids; or why the search falls back
 * to `legacy`. Search only reads the index, with the internal user; only ids leave this function.
 */
const runSemanticSearch = async ({
  term,
  logger,
  ...context
}: SemanticSearchParams): Promise<SemanticSearchResult> => {
  const { esClient, spaceId } = context;
  try {
    const check = await checkRuleSearch(context);
    if (check.status !== 'ready') {
      return { mode: 'legacy', reason: check.reason };
    }
    const key = `${spaceId}\u0000${term}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return { mode: 'semantic', ruleIds: cached.ruleIds };
    }
    const ranked = await searchRelevantRuleIds({ esClient, spaceId, term });
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

export const resolveSemanticSearch = (
  params: SemanticSearchParams
): Promise<SemanticSearchResult> => {
  const key = `${params.spaceId}\u0000${params.term}`;
  const running = inFlight.get(key);
  if (running) return running;
  const search = runSemanticSearch(params).finally(() => inFlight.delete(key));
  inFlight.set(key, search);
  return search;
};
