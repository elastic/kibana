/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type {
  FacetCounts,
  GranularRulesFacetCategory,
} from '../../../../../../common/api/detection_engine/rule_management/granular_rules_contract.gen';
import { RULES_FILTER_NAME_TO_ATTRIBUTE } from '../../../../../../common/api/detection_engine/rule_management';
import { enrichFilterWithRuleTypeMapping } from './enrich_filter_with_rule_type_mappings';
import { enrichFilterWithRuleIds } from './enrich_filter_with_rule_ids';
interface TermsAggBuckets {
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

export const computeGranularFacetCounts = async ({
  rulesClient,
  filter,
  ruleIds,
  categories,
}: {
  rulesClient: RulesClient;
  filter: string | undefined;
  ruleIds: string[] | undefined;
  categories: GranularRulesFacetCategory[];
}): Promise<FacetCounts> => {
  if (categories.length === 0) {
    return {};
  }

  const aggregations: Record<string, AggregationsAggregationContainer> = {};
  for (const category of categories) {
    // Allows us to support user friendly names while maintaining raw KQL attributes as an escape hatch.
    const fieldName = category.startsWith('alert.attributes.')
      ? category
      : RULES_FILTER_NAME_TO_ATTRIBUTE[category];
    aggregations[`facet_${category}`] = {
      terms: { field: fieldName },
    };
  }

  const enrichedFilter = enrichFilterWithRuleTypeMapping(enrichFilterWithRuleIds(filter, ruleIds));

  const raw = await rulesClient.aggregate<Record<string, TermsAggBuckets>>({
    options: { filter: enrichedFilter },
    aggs: aggregations,
  });

  const counts: FacetCounts = {};
  for (const category of categories) {
    const aggResult = raw[`facet_${category}`];
    counts[category] = bucketsToFacetMap(aggResult.buckets);
  }

  return counts;
};
