/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleUpgradeSpecifier } from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import { convertRulesFilterToKQL } from '../../../../../../../common/detection_engine/rule_management/rule_filtering';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { getPossibleUpgrades } from '../../../../prebuilt_rules/logic/utils';
import type {
  UpgradeAllPrebuiltRulesArgs,
  UpgradePrebuiltRulesResult,
} from '../detection_rules_client_interface';
import { upgradePrebuiltRules } from './upgrade_prebuilt_rules';

interface UpgradeAllPrebuiltRulesOptions extends UpgradeAllPrebuiltRulesArgs {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
}

export const upgradeAllPrebuiltRules = async ({
  filter,
  onConflict,
  defaultPickVersion,
  isDryRun,
  actionsClient,
  rulesClient,
  mlAuthz,
  ruleAssetsClient,
  ruleObjectsClient,
}: UpgradeAllPrebuiltRulesOptions): Promise<UpgradePrebuiltRulesResult> => {
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const latestVersionsMap = new Map(allLatestVersions.map((v) => [v.rule_id, v]));
  const kqlFilter = filter
    ? convertRulesFilterToKQL({
        filter: filter.name,
        tags: filter.tags,
        customizationStatus: filter.customization_status,
      })
    : undefined;
  const allCurrentVersions = await ruleObjectsClient.fetchInstalledRuleVersions({ kqlFilter });
  const upgradableRules = await getPossibleUpgrades(allCurrentVersions, latestVersionsMap, mlAuthz);

  // RuleVersionSpecifier items have no revision — the revision check in upgradePrebuiltRules is
  // skipped when revision is absent (undefined != null is false), which is correct for ALL_RULES.
  return upgradePrebuiltRules({
    ruleSpecifiers: upgradableRules as unknown as RuleUpgradeSpecifier[],
    onConflict,
    defaultPickVersion,
    isDryRun,
    actionsClient,
    rulesClient,
    mlAuthz,
    ruleAssetsClient,
    ruleObjectsClient,
  });
};
