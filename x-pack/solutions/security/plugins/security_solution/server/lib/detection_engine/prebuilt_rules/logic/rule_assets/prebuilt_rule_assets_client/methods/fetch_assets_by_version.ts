/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import type { PrebuiltRuleAsset } from '../../../../model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { validatePrebuiltRuleAssets } from '../../prebuilt_rule_assets_validation';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { createChunkedFilters, chunkedFetch, RULE_ASSET_ATTRIBUTES } from '../utils';

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

  const filters = createChunkedFilters({
    items: versions,
    mapperFn: (versionSpecifier) =>
      `(${RULE_ASSET_ATTRIBUTES}.rule_id: ${versionSpecifier.rule_id} AND ${RULE_ASSET_ATTRIBUTES}.version: ${versionSpecifier.version})`,
    clausesPerItem: 4,
  });

  const ruleAssets = await chunkedFetch(async (filter) => {
    // Usage of savedObjectsClient.bulkGet() is ~25% more performant and
    // simplifies deduplication but too many tests get broken.
    // See https://github.com/elastic/kibana/issues/218198
    const findResult = await savedObjectsClient.find<PrebuiltRuleAsset>({
      type: PREBUILT_RULE_ASSETS_SO_TYPE,
      filter,
      perPage: MAX_PREBUILT_RULES_COUNT,
    });

    return findResult.saved_objects.map((so) => so.attributes);
  }, filters);

  // Ensure the order of the returned assets matches the order of the "versions" argument.
  const ruleAssetsMap = new Map<string, PrebuiltRuleAsset>();
  for (const asset of ruleAssets) {
    ruleAssetsMap.set(asset.rule_id, asset);
  }

  const orderedRuleAssets = versions
    .map((version) => ruleAssetsMap.get(version.rule_id))
    .filter((asset) => asset !== undefined);

  return validatePrebuiltRuleAssets(orderedRuleAssets);
}
