/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';

import type { FacetCounts } from '../../../../../../common/api/detection_engine/rule_management';
import type { PrebuiltRuleAssetsFacetCategory } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { PREBUILT_RULE_ASSETS_FACET_CATEGORY_TO_ATTRIBUTE } from './prebuilt_rule_assets_facet_dimensions';

const DEFAULT_AGGREGATION_MAX_SIZE = 200;

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

/**
 * Builds Elasticsearch terms aggregations for the requested facet categories
 * using the prebuilt rule asset attribute map.
 */
export const buildPrebuiltRuleAssetsAggregations = ({
  categories,
}: {
  categories: PrebuiltRuleAssetsFacetCategory[];
}): Record<string, AggregationsAggregationContainer> => {
  const aggregations: Record<string, AggregationsAggregationContainer> = {};
  for (const category of categories) {
    const fieldName = PREBUILT_RULE_ASSETS_FACET_CATEGORY_TO_ATTRIBUTE[category];
    aggregations[`facet_${category}`] = {
      terms: { field: fieldName, size: DEFAULT_AGGREGATION_MAX_SIZE },
    };
  }

  return aggregations;
};

/**
 * Expands a raw aggregation response into a per-category facet counts object.
 */
export const expandPrebuiltRuleAssetsAggregationResult = (
  raw: Record<string, unknown>,
  categories: PrebuiltRuleAssetsFacetCategory[]
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
