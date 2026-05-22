/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../rule_monitoring/logic/event_log/event_log_constants';

import { RULES_FACET_CATEGORY_TO_ATTRIBUTE } from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_facet_dimensions';
import type {
  FacetCounts,
  GranularRulesFacetCategory,
} from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';

const DEFAULT_AGGREGATION_MAX_SIZE = 200;

interface TermsAggregateLike {
  buckets: ReadonlyArray<{ key: string | number | boolean; doc_count: number }>;
}

const bucketsToFacetMap = (buckets: TermsAggregateLike['buckets']): Record<string, number> => {
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
    const aggResult = raw[`facet_${category}`] as TermsAggregateLike | undefined;
    if (aggResult?.buckets) {
      counts[category] = bucketsToFacetMap(aggResult.buckets);
    }
  }
  return counts;
};

interface FetchGranularFacetCountsArgs {
  savedObjectsClient: SavedObjectsClientContract;
  ruleIds: string[];
  categories: GranularRulesFacetCategory[];
}

/**
 * Run terms aggregations over a set of alerting saved-object IDs in a single
 * ES round trip.
 */
export const fetchGranularFacetCounts = async ({
  savedObjectsClient,
  ruleIds,
  categories,
}: FetchGranularFacetCountsArgs): Promise<FacetCounts> => {
  if (ruleIds.length === 0 || categories.length === 0) {
    return {};
  }

  const prefixedIds = ruleIds.map((id) => `${RULE_SAVED_OBJECT_TYPE}:${id}`);
  const aggs = buildAggregations({ categories });

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource,
    Record<string, unknown>
  >({
    type: RULE_SAVED_OBJECT_TYPE,
    namespaces: [savedObjectsClient.getCurrentNamespace() ?? 'default'],
    query: { terms: { _id: prefixedIds } },
    size: 0,
    aggs,
  });

  return searchResult.aggregations
    ? expandRawAggregationResult(searchResult.aggregations, categories)
    : {};
};
