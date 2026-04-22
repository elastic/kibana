/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../prebuilt_rule_assets_type';

export function prepareQueryDslFilter(ruleIds?: string[], filter?: string): ESFilter[] {
  const queryFilter: ESFilter[] = [];

  // Exclude deprecated rules by default from all queries that use this filter.
  // For existing SOs without a `deprecated` field, the term query matches nothing,
  // so must_not correctly includes them.
  queryFilter.push({
    bool: {
      must_not: {
        term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true },
      },
    },
  });

  if (ruleIds) {
    queryFilter.push({
      terms: {
        [`${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`]: ruleIds,
      },
    });
  }

  if (filter) {
    try {
      const kqlDsl = toElasticsearchQuery(fromKueryExpression(filter));
      queryFilter.push(kqlDsl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid KQL filter: ${message}`);
    }
  }

  return queryFilter;
}

export function prepareQueryDslSort(sort?: PrebuiltRuleAssetsSort): Sort | undefined {
  const soSortFields = {
    name: `${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`,
    severity: `${PREBUILT_RULE_ASSETS_SO_TYPE}.severity_rank`,
    risk_score: `${PREBUILT_RULE_ASSETS_SO_TYPE}.risk_score`,
  };

  return sort?.map((s) => {
    return { [soSortFields[s.sort_field]]: s.sort_order };
  });
}
/**
 * `savedObjectsClient.search` method requires a non-empty "namespaces" parameter even if you want to search for space-agnostic SO types.
 * This function returns the current namespace to be passed as "namespaces" parameter.
 */
export function getPrebuiltRuleAssetsSearchNamespace(
  savedObjectsClient: SavedObjectsClientContract
) {
  return [savedObjectsClient.getCurrentNamespace() ?? 'default'];
}

export function getPrebuiltRuleAssetSoId(ruleId: string, version: number): string {
  return `${PREBUILT_RULE_ASSETS_SO_TYPE}:${ruleId}_${version}`;
}
