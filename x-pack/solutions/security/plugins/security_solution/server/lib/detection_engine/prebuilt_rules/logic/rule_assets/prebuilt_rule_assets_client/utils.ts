/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrebuiltRuleAssetsFilter } from '../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../prebuilt_rule_assets_type';

export function prepareQueryDslFilter(
  ruleIds?: string[],
  filter?: PrebuiltRuleAssetsFilter
): ESFilter[] {
  const queryFilter: ESFilter[] = [];

  if (ruleIds) {
    queryFilter.push({
      terms: {
        [`${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`]: ruleIds,
      },
    });
  }

  if (filter?.fields?.name?.include?.values) {
    filter.fields.name.include.values.forEach((name) => {
      queryFilter.push({
        wildcard: {
          [`${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`]: `*${name}*`,
        },
      });
    });
  }

  if (filter?.fields.tags?.include?.values) {
    filter.fields.tags.include.values.forEach((tag) => {
      queryFilter.push({
        term: {
          [`${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`]: tag,
        },
      });
    });
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
    return { [soSortFields[s.field]]: s.order };
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
