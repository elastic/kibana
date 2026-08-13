/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import { RULES_FACET_CATEGORY_TO_ATTRIBUTE } from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_facet_dimensions';
import type {
  FacetCounts,
  GranularRulesFacetCategory,
} from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { findRules } from './find_rules';

const DEFAULT_AGGREGATION_MAX_SIZE = 200;

const FACET_AGG_ID_CHUNK_SIZE = 1024;
export interface TermsAggBuckets {
  buckets: Array<{
    key: string | number | boolean;
    doc_count: number;
  }>;
}

const bucketsToFacetMap = (buckets: TermsAggBuckets['buckets']): Record<string, number> => {
  const facetCounts: Record<string, number> = {};
  for (const bucket of buckets) {
    const filterValue = String(bucket.key);
    facetCounts[filterValue] = bucket.doc_count;
  }
  return facetCounts;
};

export const buildAggregations = ({
  categories,
}: {
  categories: GranularRulesFacetCategory[];
}): Record<string, AggregationsAggregationContainer> => {
  const aggregations: Record<string, AggregationsAggregationContainer> = {};
  for (const category of categories) {
    aggregations[`facet_${category}`] = {
      terms: {
        field: RULES_FACET_CATEGORY_TO_ATTRIBUTE[category],
        size: DEFAULT_AGGREGATION_MAX_SIZE,
      },
    };
  }

  return aggregations;
};

export const expandRawAggregationResult = (
  raw: Record<string, unknown>,
  categories: readonly string[]
): FacetCounts => {
  const counts: FacetCounts = {};
  for (const category of categories) {
    const aggResult = raw[`facet_${category}`] as TermsAggBuckets | undefined;
    if (aggResult?.buckets) {
      counts[category] = bucketsToFacetMap(aggResult.buckets);
    }
  }
  return counts;
};

interface FetchGranularFacetCountsChunkedArgs {
  rulesClient: RulesClient;
  ruleIds: string[];
  categories: GranularRulesFacetCategory[];
  chunkSize?: number;
}

/**
 * Run the same terms aggregations as `buildAggregations` over a (potentially
 * large) set of alerting saved-object ids without OR-ing every id into one
 * KQL clause. Splits `ruleIds` into chunks, runs an aggs-only `findRules`
 * call per chunk, and merges the per-chunk terms buckets by summing
 * `doc_count` per `(category, key)`.
 */
export const fetchGranularFacetCountsChunked = async ({
  rulesClient,
  ruleIds,
  categories,
  chunkSize = FACET_AGG_ID_CHUNK_SIZE,
}: FetchGranularFacetCountsChunkedArgs): Promise<FacetCounts> => {
  if (ruleIds.length === 0 || categories.length === 0) {
    return {};
  }

  const aggs = buildAggregations({ categories });
  const merged: FacetCounts = Object.fromEntries(categories.map((c) => [c, {}]));

  for (let start = 0; start < ruleIds.length; start += chunkSize) {
    const chunk = ruleIds.slice(start, start + chunkSize);
    const result = await findRules({
      rulesClient,
      filter: undefined,
      ruleIds: chunk,
      page: 1,
      perPage: 0,
      sortField: undefined,
      sortOrder: undefined,
      fields: undefined,
      aggregations: aggs,
    });

    if (result.aggregations) {
      const partial = expandRawAggregationResult(
        result.aggregations as Record<string, unknown>,
        categories
      );
      for (const category of categories) {
        const bucket = partial[category] ?? {};
        const accum = merged[category] ?? {};
        for (const [key, count] of Object.entries(bucket)) {
          accum[key] = (accum[key] ?? 0) + count;
        }
        merged[category] = accum;
      }
    }
  }

  return merged;
};
