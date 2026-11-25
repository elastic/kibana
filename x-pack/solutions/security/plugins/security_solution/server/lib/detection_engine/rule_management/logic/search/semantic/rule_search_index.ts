/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

/**
 * The rule search index: one document per rule and space, with the text to search by meaning
 * and by words. It holds no rule data that a user can read: search returns rule ids only, and
 * RulesClient loads the rules as the user. `kibana_system` may write `.kibana*` indices.
 */
export const RULE_SEARCH_INDEX = '.kibana-security-rule-search';

/**
 * Models are pinned: with the cluster default, a later default model would put new vectors next
 * to old ones on another scale, and ranking breaks without an error. Both are multilingual.
 */
export const RULE_SEARCH_EMBEDDING_ID = '.jina-embeddings-v5-text-small';
export const RULE_SEARCH_RERANK_ID = '.jina-reranker-v3.5';

/** A new value rebuilds the index: analyzers and field types cannot change in place. */
const MAPPING_VERSION = '2';

const MAPPINGS: MappingTypeMapping = {
  dynamic: 'strict',
  _meta: { version: MAPPING_VERSION },
  properties: {
    card_version: { type: 'keyword' },
    space_id: { type: 'keyword' },
    so_id: { type: 'keyword' },
    rule_id: { type: 'keyword' },
    updated_at: { type: 'date' },
    name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    description: { type: 'text' },
    // MITRE ids with their parents ("T1003.001", "T1003"), and the rule_id: exact by words.
    ids: { type: 'text', analyzer: 'rule_ids' },
    mitre_names: { type: 'text' },
    tags: { type: 'text' },
    query: { type: 'text' },
    // "logs-windows.sysmon_operational-*" must match "sysmon" and "windows".
    index_patterns: { type: 'text', analyzer: 'rule_parts' },
    note: { type: 'text' },
    setup: { type: 'text' },
    // The reranker reads this text for each of the top 100 rules on every search, so it stays
    // short; the vector gets the whole rule.
    card: { type: 'text', index: false },
    rule_card: { type: 'semantic_text', inference_id: RULE_SEARCH_EMBEDDING_ID },
  },
};

export interface RuleSearchModels {
  embedding: boolean;
  rerank: boolean;
}

const modelsCache = new Map<'models', { at: number; models: RuleSearchModels }>();
const MODELS_TTL_MS = 60_000;

const endpointExists = async (esClient: ElasticsearchClient, inferenceId: string) => {
  try {
    await esClient.inference.get({ inference_id: inferenceId });
    return true;
  } catch {
    return false;
  }
};

/** Which pinned models this cluster has; without the embedding model search stays `legacy`. */
export const getRuleSearchModels = async (
  esClient: ElasticsearchClient
): Promise<RuleSearchModels> => {
  const cached = modelsCache.get('models');
  if (cached && Date.now() - cached.at < MODELS_TTL_MS) {
    return cached.models;
  }
  const [embedding, rerank] = await Promise.all([
    endpointExists(esClient, RULE_SEARCH_EMBEDDING_ID),
    endpointExists(esClient, RULE_SEARCH_RERANK_ID),
  ]);
  const models = { embedding, rerank };
  modelsCache.set('models', { at: Date.now(), models });
  return models;
};

export const ensureRuleSearchIndex = async (esClient: ElasticsearchClient, logger: Logger) => {
  if (await esClient.indices.exists({ index: RULE_SEARCH_INDEX })) {
    const current = await esClient.indices.getMapping({ index: RULE_SEARCH_INDEX });
    if (current[RULE_SEARCH_INDEX]?.mappings._meta?.version === MAPPING_VERSION) {
      return;
    }
    logger.info(`Rebuilding ${RULE_SEARCH_INDEX} for mapping version ${MAPPING_VERSION}`);
    await esClient.indices.delete({ index: RULE_SEARCH_INDEX });
  }
  try {
    await esClient.indices.create({
      index: RULE_SEARCH_INDEX,
      settings: {
        hidden: true,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
        analysis: {
          analyzer: {
            rule_ids: { type: 'custom', tokenizer: 'whitespace', filter: ['lowercase'] },
            rule_parts: { type: 'custom', tokenizer: 'rule_parts', filter: ['lowercase'] },
          },
          tokenizer: { rule_parts: { type: 'pattern', pattern: '[^A-Za-z0-9]+' } },
        },
      },
      mappings: MAPPINGS,
    });
  } catch (error) {
    // Two searches can create the index at the same time.
    if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
      logger.error(`Could not create ${RULE_SEARCH_INDEX}: ${error.message}`);
      throw error;
    }
  }
};
