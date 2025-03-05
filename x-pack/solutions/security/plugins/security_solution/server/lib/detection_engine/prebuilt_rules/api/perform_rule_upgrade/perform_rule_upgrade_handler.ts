/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  PerformRuleUpgradeRequestBody,
  PerformRuleUpgradeResponseBody,
  SkippedRuleUpgrade,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  ModeEnum,
  PickVersionValuesEnum,
  SkipRuleUpgradeReasonEnum,
  ThreeWayDiffConflict,
  UpgradeConflictResolutionEnum,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { aggregatePrebuiltRuleErrors } from '../../logic/aggregate_prebuilt_rule_errors';
import { performTimelinesInstallation } from '../../logic/perform_timelines_installation';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { upgradePrebuiltRules } from '../../logic/rule_objects/upgrade_prebuilt_rules';
import { createModifiedPrebuiltRuleAssets } from './create_upgradeable_rules_payload';
import { validatePerformRuleUpgradeRequest } from './validate_perform_rule_upgrade_request';
import type {
  RuleResponse,
  RuleSignatureId,
  RuleVersion,
} from '../../../../../../common/api/detection_engine';
import type { PromisePoolError } from '../../../../../utils/promise_pool';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

export const performRuleUpgradeHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, PerformRuleUpgradeRequestBody>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);
    const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);

    const { isRulesCustomizationEnabled } = detectionRulesClient.getRuleCustomizationStatus();
    const defaultPickVersion = isRulesCustomizationEnabled
      ? PickVersionValuesEnum.MERGED
      : PickVersionValuesEnum.TARGET;

    validatePerformRuleUpgradeRequest({
      isRulesCustomizationEnabled,
      payload: request.body,
      defaultPickVersion,
    });

    const { mode, dry_run: isDryRun, on_conflict: onConflict } = request.body;

    const filter = mode === ModeEnum.ALL_RULES ? request.body.filter : undefined;

    const skippedRules: SkippedRuleUpgrade[] = [];
    const updatedRules: RuleResponse[] = [];
    const ruleErrors: Array<PromisePoolError<{ rule_id: string }>> = [];
    const allErrors: PerformRuleUpgradeResponseBody['errors'] = [];

    const ruleUpgradeQueue: Array<{
      rule_id: RuleSignatureId;
      version: RuleVersion;
      revision?: number;
    }> = [];

    if (mode === ModeEnum.ALL_RULES) {
      const allLatestVersions = await ruleAssetsClient.fetchLatestVersions();
      const latestVersionsMap = new Map(
        allLatestVersions.map((version) => [version.rule_id, version])
      );
      const allCurrentVersions = await ruleObjectsClient.fetchInstalledRuleVersions({
        filter,
      });

      allCurrentVersions.forEach((current) => {
        const latest = latestVersionsMap.get(current.rule_id);
        if (latest && latest.version > current.version) {
          ruleUpgradeQueue.push({
            rule_id: current.rule_id,
            version: latest.version,
          });
        }
      });
    } else if (mode === ModeEnum.SPECIFIC_RULES) {
      ruleUpgradeQueue.push(...request.body.rules);
    }

    const BATCH_SIZE = 100;
    while (ruleUpgradeQueue.length > 0) {
      const targetRulesForUpgrade = ruleUpgradeQueue.splice(0, BATCH_SIZE);

      const [currentRules, latestRules] = await Promise.all([
        ruleObjectsClient.fetchInstalledRulesByIds({
          ruleIds: targetRulesForUpgrade.map(({ rule_id: ruleId }) => ruleId),
        }),
        ruleAssetsClient.fetchAssetsByVersion(targetRulesForUpgrade),
      ]);
      const baseRules = await ruleAssetsClient.fetchAssetsByVersion(currentRules);
      const ruleVersionsMap = zipRuleVersions(currentRules, baseRules, latestRules);

      const upgradeableRules: RuleTriad[] = [];
      targetRulesForUpgrade.forEach((targetRule) => {
        const ruleVersions = ruleVersionsMap.get(targetRule.rule_id);

        const currentVersion = ruleVersions?.current;
        const baseVersion = ruleVersions?.base;
        const targetVersion = ruleVersions?.target;

        // Check that the requested rule was found
        if (!currentVersion) {
          ruleErrors.push({
            error: new Error(
              `Rule with rule_id "${targetRule.rule_id}" and version "${targetRule.version}" not found`
            ),
            item: targetRule,
          });
          return;
        }

        // Check that the requested rule is upgradeable
        if (!targetVersion || targetVersion.version <= currentVersion.version) {
          skippedRules.push({
            rule_id: targetRule.rule_id,
            reason: SkipRuleUpgradeReasonEnum.RULE_UP_TO_DATE,
          });
          return;
        }

        // Check that rule revisions match (no update slipped in since the user reviewed the list)
        if (targetRule.revision != null && targetRule.revision !== currentVersion.revision) {
          ruleErrors.push({
            error: new Error(
              `Revision mismatch for rule_id ${targetRule.rule_id}: expected ${currentVersion.revision}, got ${targetRule.revision}`
            ),
            item: targetRule,
          });
          return;
        }

        // Check there's no conflicts
        if (onConflict === UpgradeConflictResolutionEnum.SKIP) {
          const ruleDiff = calculateRuleDiff(ruleVersions);
          const hasConflict = ruleDiff.ruleDiff.num_fields_with_conflicts > 0;

          if (hasConflict) {
            skippedRules.push({
              rule_id: targetRule.rule_id,
              reason: SkipRuleUpgradeReasonEnum.CONFLICT,
              conflict:
                ruleDiff.ruleDiff.num_fields_with_non_solvable_conflicts > 0
                  ? ThreeWayDiffConflict.NON_SOLVABLE
                  : ThreeWayDiffConflict.SOLVABLE,
            });
            return;
          }
        }

        // All checks passed, add to the list of rules to upgrade
        upgradeableRules.push({
          current: currentVersion,
          base: baseVersion,
          target: targetVersion,
        });
      });

      const { modifiedPrebuiltRuleAssets, processingErrors } = createModifiedPrebuiltRuleAssets({
        upgradeableRules,
        requestBody: request.body,
        defaultPickVersion,
      });
      ruleErrors.push(...processingErrors);

      if (isDryRun) {
        updatedRules.push(
          ...modifiedPrebuiltRuleAssets.map((rule) => convertPrebuiltRuleAssetToRuleResponse(rule))
        );
      } else {
        const { results: upgradeResults, errors: installationErrors } = await upgradePrebuiltRules(
          detectionRulesClient,
          modifiedPrebuiltRuleAssets
        );
        ruleErrors.push(...installationErrors);
        updatedRules.push(...upgradeResults.map(({ result }) => result));
      }
    }

    allErrors.push(...aggregatePrebuiltRuleErrors(ruleErrors));

    if (!isDryRun) {
      const { error: timelineInstallationError } = await performTimelinesInstallation(
        ctx.securitySolution
      );

      if (timelineInstallationError) {
        allErrors.push({
          message: timelineInstallationError,
          rules: [],
        });
      }
    }

    const body: PerformRuleUpgradeResponseBody = {
      summary: {
        total: updatedRules.length + skippedRules.length + ruleErrors.length,
        skipped: skippedRules.length,
        succeeded: updatedRules.length,
        failed: ruleErrors.length,
      },
      results: {
        updated: updatedRules,
        skipped: skippedRules,
      },
      errors: allErrors,
    };

    return response.ok({ body });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
