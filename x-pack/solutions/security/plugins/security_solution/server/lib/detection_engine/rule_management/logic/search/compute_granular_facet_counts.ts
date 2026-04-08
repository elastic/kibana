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
import { assertUnreachable } from '../../../../../../common/utility_types';
import { enrichFilterWithRuleTypeMapping } from './enrich_filter_with_rule_type_mappings';
import { enrichFilterWithRuleIds } from './enrich_filter_with_rule_ids';

const FACET_TERMS_SIZE = 100;

interface TermsAggBuckets {
  buckets: Array<{
    key: string | number | boolean;
    key_as_string?: string;
    doc_count: number;
  }>;
}

const bucketsToFacetMap = (buckets: TermsAggBuckets['buckets']): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const b of buckets) {
    const k = b.key_as_string ?? String(b.key);
    out[k] = b.doc_count;
  }
  return out;
};

const facetAggForCategory = (
  category: GranularRulesFacetCategory
): AggregationsAggregationContainer => {
  switch (category) {
    case 'tags':
      return {
        terms: {
          field: 'alert.attributes.tags',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'severity':
      return {
        terms: {
          field: 'alert.attributes.mapped_params.severity',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'risk_score':
      return {
        terms: {
          field: 'alert.attributes.mapped_params.risk_score',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'type':
      return {
        terms: {
          field: 'alert.attributes.alertTypeId',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'enabled':
      return {
        terms: {
          field: 'alert.attributes.enabled',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'customization_status':
      return {
        terms: {
          field: 'alert.attributes.params.ruleSource.isCustomized',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'execution_status':
      return {
        terms: {
          field: 'alert.attributes.lastRun.outcome',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    case 'name':
      return {
        terms: {
          field: 'alert.attributes.name.keyword',
          size: FACET_TERMS_SIZE,
          order: { _key: 'asc' },
        },
      };
    default:
      return assertUnreachable(category);
  }
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
    aggregations[`facet_${category}`] = facetAggForCategory(category);
  }

  const enrichedFilter = enrichFilterWithRuleTypeMapping(enrichFilterWithRuleIds(filter, ruleIds));

  const raw = await rulesClient.aggregate<Record<string, TermsAggBuckets>>({
    options: { filter: enrichedFilter, page: 1, perPage: 0 },
    aggs: aggregations,
  });

  const counts: FacetCounts = {};
  for (const category of categories) {
    const aggResult = raw[`facet_${category}`];
    if (aggResult?.buckets) {
      counts[category] = bucketsToFacetMap(aggResult.buckets);
    }
  }

  return counts;
};
