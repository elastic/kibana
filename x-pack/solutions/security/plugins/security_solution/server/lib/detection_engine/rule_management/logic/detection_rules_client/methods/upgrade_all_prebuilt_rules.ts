/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  PickVersionValues,
  UpgradeConflictResolutionStrategy,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import type { PrebuiltRulesFilter } from '../../../../../../../common/api/detection_engine';
import { convertRulesFilterToKQL } from '../../../../../../../common/detection_engine/rule_management/rule_filtering';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { getPossibleUpgrades } from '../../../../prebuilt_rules/logic/utils';
import type { UpgradePrebuiltRulesResult } from '../detection_rules_client_interface';
import { upgradePrebuiltRules } from './upgrade_prebuilt_rules';

interface UpgradeAllPrebuiltRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
}

interface UpgradeAllPrebuiltRulesParams {
  filter?: PrebuiltRulesFilter;
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy;
  defaultPickVersion: PickVersionValues;
  isDryRun: boolean;
  deps: UpgradeAllPrebuiltRulesDeps;
}

export async function upgradeAllPrebuiltRules({
  filter,
  conflictResolutionStrategy,
  defaultPickVersion,
  isDryRun,
  deps,
}: UpgradeAllPrebuiltRulesParams): Promise<UpgradePrebuiltRulesResult> {
  const { mlAuthz, ruleAssetsClient, ruleObjectsClient } = deps;
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
  const ruleUpgradeSpecifiers = await getPossibleUpgrades(
    allCurrentVersions,
    latestVersionsMap,
    mlAuthz
  );

  return upgradePrebuiltRules({
    ruleSpecifiers: ruleUpgradeSpecifiers,
    conflictResolutionStrategy,
    defaultPickVersion,
    isDryRun,
    deps,
  });
}
