/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { SkipRuleInstallReason } from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  InstalledRuleBasicInfo,
  SkippedRuleInstall,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { PREBUILT_RULE_BATCH_SIZE } from '../../../../prebuilt_rules/constants';
import { createRule } from './create_rule';
import type { InstallPrebuiltRulesResult } from '../detection_rules_client_interface';
import type { RuleVersionSpecifier } from '../../../../prebuilt_rules/logic/rule_versions/rule_version_specifier';

interface InstallPrebuiltRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
}

interface InstallPrebuiltRulesParams {
  ruleSpecifiers: Array<RuleVersionSpecifier>;
  deps: InstallPrebuiltRulesDeps;
}

export async function installPrebuiltRules({
  ruleSpecifiers,
  deps: { actionsClient, rulesClient, mlAuthz, ruleAssetsClient, ruleObjectsClient },
}: InstallPrebuiltRulesParams): Promise<InstallPrebuiltRulesResult> {
  const requestedRuleIds = ruleSpecifiers.map((ruleSpecifier) => ruleSpecifier.rule_id);
  const [latestVersions, installedVersions] = await Promise.all([
    ruleAssetsClient.fetchLatestVersions({ ruleIds: requestedRuleIds }),
    ruleObjectsClient.fetchInstalledRuleVersionsByIds({ ruleIds: requestedRuleIds }),
  ]);
  const installedRuleIds = new Set(installedVersions.map((v) => v.rule_id));
  const installableRuleIds = new Set(
    latestVersions.filter((v) => !installedRuleIds.has(v.rule_id)).map((v) => v.rule_id)
  );

  const ruleInstallQueue: Array<{ rule_id: string; version: number }> = [];
  const skippedRules: SkippedRuleInstall[] = [];
  const queueErrors: Array<PromisePoolError<{ rule_id: string }>> = [];

  for (const ruleSpecifier of ruleSpecifiers) {
    if (installedRuleIds.has(ruleSpecifier.rule_id)) {
      skippedRules.push({
        rule_id: ruleSpecifier.rule_id,
        reason: SkipRuleInstallReason.ALREADY_INSTALLED,
      });
    } else if (!installableRuleIds.has(ruleSpecifier.rule_id)) {
      queueErrors.push({
        error: new Error(
          `Rule with ID "${ruleSpecifier.rule_id}" and version "${ruleSpecifier.version}" not found`
        ),
        item: { rule_id: ruleSpecifier.rule_id },
      });
    } else {
      ruleInstallQueue.push(ruleSpecifier);
    }
  }

  const installedRules: InstalledRuleBasicInfo[] = [];
  const installErrors: Array<PromisePoolError<{ rule_id: string }>> = [];
  const bulkCount = ruleInstallQueue.length;
  const changeTracking = {
    action: SecurityRuleChangeTrackingAction.ruleInstall,
    metadata: { bulkCount },
  };

  while (ruleInstallQueue.length > 0) {
    const batch = ruleInstallQueue.splice(0, PREBUILT_RULE_BATCH_SIZE);
    const { assets: ruleAssets } = await ruleAssetsClient.fetchAssetsByVersion(batch);

    const { results, errors: batchErrors } = await initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ruleAssets,
      executor: async (rule) => {
        return createRule({
          rule: { ...rule, immutable: true },
          deps: { actionsClient, rulesClient, mlAuthz },
          changeTracking,
        });
      },
    });

    installedRules.push(
      ...results.map(({ result: rule }) => pick(rule, ['id', 'rule_id', 'version']))
    );
    installErrors.push(
      ...batchErrors.map(({ error, item }) => ({
        error,
        item: { rule_id: item.rule_id },
      }))
    );
  }

  return {
    installedRules,
    skippedRules,
    errors: [...queueErrors, ...installErrors],
  };
}
