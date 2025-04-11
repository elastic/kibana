/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { PrebuiltRuleAsset } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules';
import type { Client } from '@elastic/elasticsearch';
import type SuperTest from 'supertest';
import {
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
} from './create_prebuilt_rule_saved_objects';
import { patchRule } from '../patch_rule';
import { installPrebuiltRules } from './install_prebuilt_rules';
import { deleteAllPrebuiltRuleAssets } from './delete_all_prebuilt_rule_assets';

interface SetUpRuleUpgradeDeps {
  supertest: SuperTest.Agent;
  log: ToolingLog;
  es: Client;
}

type PartialPrebuiltRuleAsset = Pick<PrebuiltRuleAsset, 'type'> & Partial<PrebuiltRuleAsset>;

export interface RuleUpgradeAssets {
  installed: PartialPrebuiltRuleAsset;
  patch: Partial<RuleResponse>;
  upgrade: PartialPrebuiltRuleAsset;
}

interface SetUpRuleUpgradeParams {
  assets: RuleUpgradeAssets | RuleUpgradeAssets[];
  removeInstalledAssets?: boolean;
  deps: SetUpRuleUpgradeDeps;
}

export const DEFAULT_TEST_RULE_ID = 'test-rule';
export const DEFAULT_INSTALLED_RULE_VERSION = 1;
export const DEFAULT_RULE_UPDATE_VERSION = 2;

export async function setUpRuleUpgrade({
  assets,
  removeInstalledAssets,
  deps,
}: SetUpRuleUpgradeParams): Promise<void> {
  const rulesAssets = [assets].flat();

  for (const ruleAssets of rulesAssets) {
    await createHistoricalPrebuiltRuleAssetSavedObjects(deps.es, [
      createRuleAssetSavedObjectOfType(ruleAssets.installed.type, {
        rule_id: DEFAULT_TEST_RULE_ID,
        version: DEFAULT_INSTALLED_RULE_VERSION,
        ...ruleAssets.installed,
      }),
    ]);
  }

  await installPrebuiltRules(deps.es, deps.supertest);

  for (const ruleAssets of rulesAssets) {
    if (Object.keys(ruleAssets.patch).length > 0) {
      await patchRule(deps.supertest, deps.log, {
        rule_id: DEFAULT_TEST_RULE_ID,
        ...ruleAssets.patch,
      });
    }
  }

  if (removeInstalledAssets) {
    await deleteAllPrebuiltRuleAssets(deps.es, deps.log);
  }

  for (const ruleAssets of rulesAssets) {
    await createHistoricalPrebuiltRuleAssetSavedObjects(deps.es, [
      createRuleAssetSavedObjectOfType(ruleAssets.upgrade.type, {
        rule_id: DEFAULT_TEST_RULE_ID,
        version: DEFAULT_RULE_UPDATE_VERSION,
        ...ruleAssets.upgrade,
      }),
    ]);
  }
}
