/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { validateDeprecatedRuleAssets } from '../../prebuilt_rule_assets_validation';
import { MAX_DEPRECATED_RULES_TO_RETURN } from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { getPrebuiltRuleAssetsSearchNamespace } from '../utils';
import type { DeprecatedPrebuiltRuleAsset } from '../../../../model/rule_assets/deprecated_prebuilt_rule_asset';

/**
 * Fetches deprecated prebuilt rule assets (SOs with deprecated: true).
 * Optionally scoped to a set of rule_ids.
 * Results are capped at MAX_DEPRECATED_RULES_TO_RETURN.
 */
export const fetchDeprecatedRules = async (
  savedObjectsClient: SavedObjectsClientContract,
  ruleIds?: string[]
): Promise<DeprecatedPrebuiltRuleAsset[]> => {
  const filterParts = [`${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.deprecated: true`];

  if (ruleIds) {
    if (ruleIds.length === 0) {
      return [];
    }

    const ruleIdFilter = ruleIds
      .map((id) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id: "${id}"`)
      .join(' OR ');
    filterParts.push(`(${ruleIdFilter})`);
  }

  const searchResult = await savedObjectsClient.find<DeprecatedPrebuiltRuleAsset>({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    perPage: MAX_DEPRECATED_RULES_TO_RETURN,
    filter: filterParts.join(' AND '),
  });

  return validateDeprecatedRuleAssets(searchResult.saved_objects.map((so) => so.attributes));
};
