/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import type { PrebuiltRuleAsset } from '../../../../model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { validatePrebuiltRuleAssets } from '../../prebuilt_rule_assets_validation';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { getPrebuiltRuleAssetSoId, getPrebuiltRuleAssetsSearchNamespace } from '../utils';

/**
 * Fetches prebuilt rule assets for specified rule versions.
 *
 * Takes a list of objects with "rule_id" and "version" properties.
 * Returns full prebuilt rule.
 *
 * @param savedObjectsClient - The saved objects client used to query the saved objects store
 * @param versions - An array of rule version specifiers, each containing a rule_id and version.
 * @returns A promise that resolves to an array of prebuilt rule assets.
 */
export async function fetchAssetsByVersion(
  savedObjectsClient: SavedObjectsClientContract,
  versions: RuleVersionSpecifier[]
): Promise<PrebuiltRuleAsset[]> {
  if (versions.length === 0) {
    // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
    return [];
  }

  const soIds = versions.map((version) =>
    getPrebuiltRuleAssetSoId(version.rule_id, version.version)
  );

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource & {
      [PREBUILT_RULE_ASSETS_SO_TYPE]: PrebuiltRuleAsset;
    }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    size: MAX_PREBUILT_RULES_COUNT,
    query: {
      terms: {
        _id: soIds,
      },
    },
  });

  const ruleAssets = searchResult.hits.hits.map((hit) => {
    const hitSource = hit?._source;
    invariant(hitSource, 'Expected hit source to be defined');

    const savedObject = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
    return savedObject;
  });

  // Ensure the order of the returned assets matches the order of the "versions" argument.
  const ruleAssetsMap = new Map<string, PrebuiltRuleAsset>();
  for (const asset of ruleAssets) {
    const key = getPrebuiltRuleAssetSoId(asset.rule_id, asset.version);
    ruleAssetsMap.set(key, asset);
  }

  const orderedRuleAssets = soIds
    .map((soId) => ruleAssetsMap.get(soId))
    .filter((asset) => asset !== undefined);

  return validatePrebuiltRuleAssets(orderedRuleAssets);
}
