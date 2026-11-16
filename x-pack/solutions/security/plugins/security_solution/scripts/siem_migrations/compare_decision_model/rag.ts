/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { RuleMigrationRule } from '../../../common/siem_migrations/model/rule_migration.gen';
import type {
  RuleMigrationIntegration,
  RuleMigrationPrebuiltRule,
} from '../../../server/lib/siem_migrations/rules/types';

const BASE_INDEX = '.kibana-siem-rule-migrations';
const INTEGRATIONS_INDEX = `${BASE_INDEX}-integrations`;
const PREBUILT_RULES_INDEX = `${BASE_INDEX}-prebuiltrules`;
const PREBUILT_RULE_ASSETS_INDEX = '.kibana_security_solution';
const PREBUILT_RULE_ASSETS_SO_TYPE = 'security-rule';
/** Elasticsearch's default `index.max_result_window`. */
const MAX_RESULT_WINDOW = 10_000;

const toStored = <T>(hits: Array<SearchHit<T>>) =>
  hits.map((hit) => ({ ...(hit._source as T), id: hit._id as string }));

/** Every migration rule in the space, from all its migrations. */
export const getSpaceRules = async (
  esClient: Client,
  { spaceId, limit }: { spaceId: string; limit: number }
): Promise<RuleMigrationRule[]> => {
  const response = await esClient.search<RuleMigrationRule>({
    index: `${BASE_INDEX}-rules-${spaceId}`,
    query: { match_all: {} },
    size: Math.min(limit, MAX_RESULT_WINDOW),
    sort: [{ _doc: 'asc' }],
  });
  return toStored(response.hits.hits);
};

// Copied from server/lib/siem_migrations/rules/data/rule_migrations_data_integrations_client.ts
const INTEGRATION_WEIGHTS = [
  { ids: ['endpoint'], weight: 10 },
  { ids: ['network_traffic'], weight: 10 },
];
const EXCLUDED_INTEGRATIONS = [
  'splunk',
  'elastic_security',
  'ibm_qradar',
  'microsoft_sentinel',
  'sentinel_one',
  'sentinel_one_cloud_funnel',
];
const INTEGRATIONS_MIN_SCORE = 7;
const RETURNED_INTEGRATIONS = 7;

export const searchIntegrations = async (
  esClient: Client,
  semanticQuery: string
): Promise<RuleMigrationIntegration[]> => {
  const response = await esClient.search<RuleMigrationIntegration>({
    index: INTEGRATIONS_INDEX,
    query: {
      function_score: {
        query: {
          bool: {
            must: { semantic: { query: semanticQuery, field: 'elser_embedding' } },
            must_not: { ids: { values: EXCLUDED_INTEGRATIONS } },
            filter: { exists: { field: 'data_streams' } },
          },
        },
        functions: INTEGRATION_WEIGHTS.map(({ ids, weight }) => ({
          filter: { ids: { values: ids } },
          weight,
        })),
        score_mode: 'multiply',
        boost_mode: 'multiply',
      },
    },
    size: RETURNED_INTEGRATIONS,
    min_score: INTEGRATIONS_MIN_SCORE,
  });
  return toStored(response.hits.hits);
};

// Copied from server/lib/siem_migrations/rules/data/rule_migrations_data_prebuilt_rules_client.ts
const PREBUILT_RULES_MIN_SCORE = 40;
const RETURNED_RULES = 5;

export interface PrebuiltRuleCandidate extends RuleMigrationPrebuiltRule {
  /** The latest prebuilt rule asset: the `target` version the graph reads `query` from. */
  target?: { type?: string; query?: string };
}

export const searchPrebuiltRules = async (
  esClient: Client,
  semanticQuery: string,
  techniqueIds: string
): Promise<PrebuiltRuleCandidate[]> => {
  const response = await esClient.search<RuleMigrationPrebuiltRule>({
    index: PREBUILT_RULES_INDEX,
    query: {
      bool: {
        should: [
          { semantic: { query: semanticQuery, field: 'elser_embedding', boost: 1.5 } },
          { multi_match: { query: semanticQuery, fields: ['name^2', 'description'], boost: 3 } },
          { multi_match: { query: techniqueIds, fields: ['mitre_attack_ids'], boost: 2 } },
        ],
      },
    },
    size: RETURNED_RULES,
    min_score: PREBUILT_RULES_MIN_SCORE,
  });
  const rules = toStored(response.hits.hits);
  const targets = await fetchLatestAssets(
    esClient,
    rules.map(({ rule_id: ruleId }) => ruleId)
  );
  return rules.map((rule) => ({ ...rule, target: targets.get(rule.rule_id) }));
};

/**
 * The latest non-deprecated asset per rule id. Copied from the saved objects queries in
 * server/lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client/methods/
 * (fetch_latest_assets.ts, fetch_deprecated_rules.ts), run directly against the saved objects index.
 */
const fetchLatestAssets = async (
  esClient: Client,
  ruleIds: string[]
): Promise<Map<string, { type?: string; query?: string }>> => {
  if (ruleIds.length === 0) {
    return new Map();
  }
  const ruleIdField = `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`;
  const response = await esClient.search({
    index: PREBUILT_RULE_ASSETS_INDEX,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { type: PREBUILT_RULE_ASSETS_SO_TYPE } },
          { terms: { [ruleIdField]: ruleIds } },
        ],
      },
    },
    aggs: {
      rules: {
        terms: { field: ruleIdField, size: ruleIds.length },
        aggs: {
          deprecated: {
            filter: { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true } },
          },
          latest_version: {
            top_hits: { size: 1, sort: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.version`]: 'desc' } },
          },
        },
      },
    },
  });

  interface AssetBucket {
    key: string;
    deprecated: { doc_count: number };
    latest_version: {
      hits: { hits: Array<{ _source: Record<string, { type?: string; query?: string }> }> };
    };
  }
  const buckets =
    (response.aggregations?.rules as { buckets?: AssetBucket[] } | undefined)?.buckets ?? [];
  return new Map(
    buckets
      .filter((bucket) => bucket.deprecated.doc_count === 0)
      .map((bucket) => [
        bucket.key,
        bucket.latest_version.hits.hits[0]._source[PREBUILT_RULE_ASSETS_SO_TYPE],
      ])
  );
};
