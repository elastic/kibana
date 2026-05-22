/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';

import type {
  FacetCounts,
  GranularRulesFacetCategory,
} from '../../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { RULES_FACET_CATEGORY_TO_ATTRIBUTE } from '../../../../../../common/api/detection_engine/rule_management';

const DEFAULT_AGGREGATION_MAX_SIZE = 200;

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
    // Allows us to support user friendly names while maintaining raw KQL attributes as an escape hatch.
    const fieldName = category.startsWith('alert.attributes.')
      ? category
      : RULES_FACET_CATEGORY_TO_ATTRIBUTE[category];
    aggregations[`facet_${category}`] = {
      terms: { field: fieldName, size: DEFAULT_AGGREGATION_MAX_SIZE },
    };
  }

  return aggregations;
};

export const expandRawAggregationResult = (
  raw: Record<string, unknown>,
  categories: GranularRulesFacetCategory[]
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
