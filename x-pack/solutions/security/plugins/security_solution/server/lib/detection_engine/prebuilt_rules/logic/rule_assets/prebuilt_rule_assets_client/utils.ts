/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../prebuilt_rule_assets_type';

/**
 * Builds the base Elasticsearch DSL filter used by the "latest versions"
 * aggregation query: excludes deprecated rules and optionally scopes to a
 * provided set of `rule_ids`.
 */
export function prepareLatestVersionsFilter(ruleIds?: string[]): ESFilter[] {
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

  return queryFilter;
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
