/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { excludeLicenseRestrictedRules } from '../../../../prebuilt_rules/logic/utils';
import type { InstallPrebuiltRulesResult } from '../detection_rules_client_interface';
import { installPrebuiltRules } from './install_prebuilt_rules';

interface InstallAllPrebuiltRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
}

interface InstallAllPrebuiltRulesParams {
  deps: InstallAllPrebuiltRulesDeps;
}

export async function installAllPrebuiltRules({
  deps,
}: InstallAllPrebuiltRulesParams): Promise<InstallPrebuiltRulesResult> {
  const { mlAuthz, ruleAssetsClient, ruleObjectsClient } = deps;
  const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
  const currentRuleVersions = await ruleObjectsClient.fetchInstalledRuleVersions();
  const currentRuleVersionsMap = new Map(currentRuleVersions.map((v) => [v.rule_id, v]));
  const allInstallableRules = allLatestVersions.filter(
    (latestVersion) => !currentRuleVersionsMap.has(latestVersion.rule_id)
  );
  const ruleSpecifiers = await excludeLicenseRestrictedRules(allInstallableRules, mlAuthz);

  return installPrebuiltRules({
    ruleSpecifiers,
    deps,
  });
}
