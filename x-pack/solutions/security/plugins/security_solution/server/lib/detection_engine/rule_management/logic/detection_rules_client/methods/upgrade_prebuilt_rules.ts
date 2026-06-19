/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { isRuleCustomized } from '../../../../../../../common/detection_engine/rule_management/utils';
import {
  SkipRuleUpgradeReasonEnum,
  ThreeWayDiffConflict,
  UpgradeConflictResolutionStrategyEnum,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import type {
  SkippedRuleUpgrade,
  UpgradedRuleBasicInfo,
  FullThreeWayRuleDiff,
  RuleUpgradeSpecifier,
  ThreeWayDiff,
  PickVersionValues,
  UpgradeConflictResolutionStrategy,
} from '../../../../../../../common/api/detection_engine/prebuilt_rules';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { IPrebuiltRuleObjectsClient } from '../../../../prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { PREBUILT_RULE_BATCH_SIZE } from '../../../../prebuilt_rules/constants';
import { createModifiedPrebuiltRuleAssets } from '../../../../prebuilt_rules/logic/create_modified_prebuilt_rule_assets';
import { calculateRuleDiff } from '../../../../prebuilt_rules/logic/diff/calculate_rule_diff';
import { zipRuleVersions } from '../../../../prebuilt_rules/logic/rule_versions/zip_rule_versions';
import type { RuleTriad } from '../../../../prebuilt_rules/model/rule_groups/get_rule_groups';
import type { RuleUpgradeContext } from '../../../../prebuilt_rules/api/perform_rule_upgrade/update_rule_telemetry';
import { applyPrebuiltRuleAsset } from '../util_methods/apply_prebuilt_rule_asset';
import type { UpgradePrebuiltRulesResult } from '../detection_rules_client_interface';

interface UpgradePrebuiltRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  ruleAssetsClient: IPrebuiltRuleAssetsClient;
  ruleObjectsClient: IPrebuiltRuleObjectsClient;
}

interface UpgradePrebuiltRulesParams {
  ruleSpecifiers: RuleUpgradeSpecifier[];
  conflictResolutionStrategy?: UpgradeConflictResolutionStrategy;
  defaultPickVersion: PickVersionValues;
  isDryRun: boolean;
  deps: UpgradePrebuiltRulesDeps;
}

export async function upgradePrebuiltRules({
  ruleSpecifiers,
  conflictResolutionStrategy,
  defaultPickVersion,
  isDryRun,
  deps: { actionsClient, rulesClient, mlAuthz, ruleAssetsClient, ruleObjectsClient },
}: UpgradePrebuiltRulesParams): Promise<UpgradePrebuiltRulesResult> {
  // Only include specifiers that carry actual per-rule configuration (pick_version or fields).
  // Specifiers without these (e.g. plain RuleVersionSpecifier items from ALL_RULES mode)
  // are excluded so that createModifiedPrebuiltRuleAssets receives `undefined` and correctly
  // falls into the ALL_RULES code path (conflict detection, globalPickVersion, etc.).
  const upgradeSpecifiers = new Map(
    ruleSpecifiers
      .filter((r) => r.pick_version !== undefined || r.fields !== undefined)
      .map((r) => [r.rule_id, r])
  );
  const ruleUpgradeQueue = [...ruleSpecifiers];

  const skippedRules: SkippedRuleUpgrade[] = [];
  const updatedRules: UpgradedRuleBasicInfo[] = [];
  const errors: Array<PromisePoolError<{ rule_id: string }>> = [];
  const ruleUpgradeContextsMap = new Map<string, RuleUpgradeContext>();

  while (ruleUpgradeQueue.length > 0) {
    const targetRulesForUpgrade = ruleUpgradeQueue.splice(0, PREBUILT_RULE_BATCH_SIZE);

    const [currentRules, latestRulesResult] = await Promise.all([
      ruleObjectsClient.fetchInstalledRulesByIds({
        ruleIds: targetRulesForUpgrade.map(({ rule_id: ruleId }) => ruleId),
      }),
      ruleAssetsClient.fetchAssetsByVersion(targetRulesForUpgrade),
    ]);
    const baseRulesResult = await ruleAssetsClient.fetchAssetsByVersion(currentRules);
    const ruleVersionsMap = zipRuleVersions(
      currentRules,
      baseRulesResult.assets,
      latestRulesResult.assets
    );

    const upgradeableRules: RuleTriad[] = [];
    targetRulesForUpgrade.forEach((targetRule) => {
      const ruleVersions = ruleVersionsMap.get(targetRule.rule_id);
      const currentVersion = ruleVersions?.current;
      const baseVersion = ruleVersions?.base;
      const targetVersion = ruleVersions?.target;

      if (!currentVersion) {
        errors.push({
          error: new Error(
            `Currently installed rule with rule_id "${targetRule.rule_id}" not found`
          ),
          item: { rule_id: targetRule.rule_id },
        });
        return;
      }

      if (!targetVersion || targetVersion.version <= currentVersion.version) {
        skippedRules.push({
          rule_id: targetRule.rule_id,
          reason: SkipRuleUpgradeReasonEnum.RULE_UP_TO_DATE,
        });
        return;
      }

      if (targetRule.revision != null && targetRule.revision !== currentVersion.revision) {
        errors.push({
          error: new Error(
            `Revision mismatch for rule_id ${targetRule.rule_id}: expected ${currentVersion.revision}, got ${targetRule.revision}`
          ),
          item: { rule_id: targetRule.rule_id },
        });
        return;
      }

      if (conflictResolutionStrategy === UpgradeConflictResolutionStrategyEnum.SKIP) {
        const ruleUpgradeSpecifier = upgradeSpecifiers.get(targetRule.rule_id);
        const { ruleDiff } = calculateRuleDiff(ruleVersions);
        const conflict = getRuleUpgradeConflictState(ruleDiff, ruleUpgradeSpecifier);

        if (conflict !== ThreeWayDiffConflict.NONE) {
          skippedRules.push({
            rule_id: targetRule.rule_id,
            reason: SkipRuleUpgradeReasonEnum.CONFLICT,
            conflict,
          });
          ruleUpgradeContextsMap.set(targetRule.rule_id, {
            ruleId: targetRule.rule_id,
            ruleName: currentVersion.name,
            hasBaseVersion: !!baseVersion,
            isCustomized: isRuleCustomized(currentVersion),
            fieldsDiff: ruleDiff.fields,
          });
          return;
        }
      }

      upgradeableRules.push({ current: currentVersion, base: baseVersion, target: targetVersion });
    });

    const {
      modifiedPrebuiltRuleAssets,
      processingErrors,
      ruleUpgradeContexts: batchContexts,
    } = createModifiedPrebuiltRuleAssets({
      upgradeableRules,
      globalPickVersion: defaultPickVersion,
      conflictResolutionStrategy,
      upgradeSpecifiers: upgradeSpecifiers.size > 0 ? upgradeSpecifiers : undefined,
    });

    errors.push(...processingErrors);
    for (const ctx of batchContexts) {
      ruleUpgradeContextsMap.set(ctx.ruleId, ctx);
    }

    if (isDryRun) {
      updatedRules.push(
        ...modifiedPrebuiltRuleAssets.map((rule) => ({
          id: uuidv4(),
          rule_id: rule.rule_id,
          version: rule.version,
        }))
      );
    } else {
      const bulkCount = modifiedPrebuiltRuleAssets.length;
      const changeTracking = { metadata: { bulkCount } };

      const { results: upgradeResults, errors: installationErrors } = await initPromisePool({
        concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
        items: modifiedPrebuiltRuleAssets,
        executor: async (rule) => {
          return applyPrebuiltRuleAsset({
            asset: rule,
            deps: {
              actionsClient,
              rulesClient,
              mlAuthz,
              prebuiltRuleAssetClient: ruleAssetsClient,
            },
            changeTracking,
          });
        },
      });

      errors.push(
        ...installationErrors.map(({ error, item }) => ({
          error,
          item: { rule_id: item.rule_id },
        }))
      );
      updatedRules.push(
        ...upgradeResults.map(({ result: rule }) => pick(rule, ['id', 'rule_id', 'version']))
      );
    }
  }

  return { updatedRules, skippedRules, errors, ruleUpgradeContexts: ruleUpgradeContextsMap };
}

function getRuleUpgradeConflictState(
  ruleDiff: FullThreeWayRuleDiff,
  ruleUpgradeSpecifier?: RuleUpgradeSpecifier
): ThreeWayDiffConflict {
  if (ruleDiff.num_fields_with_conflicts === 0) {
    return ThreeWayDiffConflict.NONE;
  }

  if (!ruleUpgradeSpecifier) {
    return ruleDiff.num_fields_with_non_solvable_conflicts > 0
      ? ThreeWayDiffConflict.NON_SOLVABLE
      : ThreeWayDiffConflict.SOLVABLE;
  }

  let result = ThreeWayDiffConflict.NONE;

  for (const [fieldName, fieldThreeWayDiff] of Object.entries<ThreeWayDiff<unknown>>(
    ruleDiff.fields
  )) {
    const hasResolvedValue =
      ruleUpgradeSpecifier.fields?.[fieldName as keyof typeof ruleUpgradeSpecifier.fields]
        ?.pick_version === 'RESOLVED';

    if (fieldThreeWayDiff.conflict === ThreeWayDiffConflict.NON_SOLVABLE && !hasResolvedValue) {
      return ThreeWayDiffConflict.NON_SOLVABLE;
    } else if (fieldThreeWayDiff.conflict === ThreeWayDiffConflict.SOLVABLE && !hasResolvedValue) {
      result = ThreeWayDiffConflict.SOLVABLE;
    }
  }

  return result;
}
