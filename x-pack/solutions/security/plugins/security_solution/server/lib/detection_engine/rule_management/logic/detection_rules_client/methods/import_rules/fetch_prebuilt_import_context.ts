/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_LIBRARY_ID } from '@kbn/security-rule-libraries';
import type { RuleToImport } from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset, PrebuiltRuleAssetRecord } from '../../../../../prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { withSecuritySpan } from '../../../../../../../utils/with_security_span';

export interface PrebuiltImportContext {
  /** Prebuilt asset for the imported `(rule_id, version)`. */
  matchingAssetsByRuleId: Record<string, PrebuiltRuleAsset>;
  /** `rule_id`s the current prebuilt package (or its deprecated tail) recognises. */
  availableRuleAssetIds: Set<string>;
}

export const fetchPrebuiltImportContext = async ({
  rules,
  ruleAssetsClient,
}: {
  rules: RuleToImport[];
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
}): Promise<PrebuiltImportContext> =>
  withSecuritySpan('ruleManagement.fetchPrebuiltImportContext', async () => {
    const ruleIds = rules.map((r) => r.rule_id);
    const ruleVersions = rules.flatMap((r) =>
      r.version == null ? [] : [{ rule_id: r.rule_id, version: r.version }]
    );

    const [latestAssets, deprecatedAssets, matchingAssets] = await Promise.all([
      ruleAssetsClient.fetchLatestVersions({ ruleIds }),
      ruleAssetsClient.fetchDeprecatedRules(ruleIds),
      ruleAssetsClient.fetchAssetsByVersion(ruleVersions).then((r) => r.assets),
    ]);

    const matchingAssetsByRuleId: Record<string, PrebuiltRuleAssetRecord> = {};
    for (const asset of matchingAssets) {
      const existing = matchingAssetsByRuleId[asset.rule_id];
      const assetLibrary = asset.library_id ?? ELASTIC_LIBRARY_ID;
      const existingLibrary = existing?.library_id ?? ELASTIC_LIBRARY_ID;
      const preferAsset =
        !existing ||
        (existingLibrary !== ELASTIC_LIBRARY_ID && assetLibrary === ELASTIC_LIBRARY_ID);
      if (preferAsset) {
        matchingAssetsByRuleId[asset.rule_id] = asset;
      }
    }

    const availableRuleAssetIds = new Set<string>([
      ...latestAssets.map((s) => s.rule_id),
      ...deprecatedAssets.map((s) => s.rule_id),
    ]);

    return { matchingAssetsByRuleId, availableRuleAssetIds };
  });
