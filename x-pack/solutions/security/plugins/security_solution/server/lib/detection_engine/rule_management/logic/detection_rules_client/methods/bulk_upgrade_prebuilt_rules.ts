/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../../common/constants';
import { PREBUILT_RULES_UPGRADE_BATCH_SIZE } from '../../../../prebuilt_rules/constants';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { ClientError, mergeExceptionLists, validateMlAuth } from '../utils';
import type {
  BulkUpgradePrebuiltRulesArgs,
  BulkUpgradePrebuiltRulesResult,
} from '../detection_rules_client_interface';
import { getRuleByRuleId } from './get_rule_by_rule_id';
import { upgradePrebuiltRule } from './upgrade_prebuilt_rule';
import { bulkUpdateRules } from './bulk_update_rules';

interface BulkUpgradePrebuiltRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  mlAuthz: MlAuthz;
  args: BulkUpgradePrebuiltRulesArgs;
}

export const bulkUpgradePrebuiltRules = async ({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  mlAuthz,
  args: { rules, changeTracking },
}: BulkUpgradePrebuiltRulesOptions): Promise<BulkUpgradePrebuiltRulesResult> => {
  if (rules.length === 0) {
    return { results: [], errors: [] };
  }

  const typeChange: PrebuiltRuleAsset[] = [];
  const toUpdate: Array<{ asset: PrebuiltRuleAsset; rule: RuleResponse }> = [];
  const errors: BulkUpgradePrebuiltRulesResult['errors'] = [];

  for (const asset of rules) {
    try {
      await validateMlAuth(mlAuthz, asset.type);

      const existingRule = await getRuleByRuleId({
        rulesClient,
        ruleId: asset.rule_id,
      });

      if (!existingRule) {
        throw new ClientError(`Failed to find rule ${asset.rule_id}`, 500);
      }

      if (asset.type !== existingRule.type) {
        typeChange.push(asset);
      } else {
        const updatedRule = await applyRuleUpdate({
          prebuiltRuleAssetClient,
          existingRule,
          ruleUpdate: asset,
        });

        if (existingRule.actions.length) {
          updatedRule.actions = existingRule.actions;
        }

        toUpdate.push({
          asset,
          rule: mergeExceptionLists(updatedRule, existingRule),
        });
      }
    } catch (error) {
      errors.push({
        item: asset,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  const typeChangeResult = await initPromisePool({
    concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
    items: typeChange,
    executor: async (rule) =>
      upgradePrebuiltRule({
        actionsClient,
        rulesClient,
        ruleAsset: rule,
        mlAuthz,
        prebuiltRuleAssetClient,
        changeTracking,
      }),
  });

  const results: BulkUpgradePrebuiltRulesResult['results'] = typeChangeResult.results.map(
    ({ result }) => ({
      id: result.id,
      rule_id: result.rule_id,
      version: result.version,
    })
  );

  for (const { item, error } of typeChangeResult.errors) {
    errors.push({
      item,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }

  if (toUpdate.length > 0) {
    const { successfulIds, errors: bulkErrors } = await bulkUpdateRules({
      actionsClient,
      rulesClient,
      args: {
        rules: toUpdate.map(({ rule }) => rule),
        batchSize: PREBUILT_RULES_UPGRADE_BATCH_SIZE,
        changeTracking: {
          action: SecurityRuleChangeTrackingAction.ruleUpgrade,
          ...changeTracking,
        },
      },
    });

    const successIds = new Set(successfulIds);
    const errorById = new Map(bulkErrors.map((err) => [err.rule.id, err]));

    for (const { asset, rule } of toUpdate) {
      if (successIds.has(rule.id)) {
        results.push({ id: rule.id, rule_id: rule.rule_id, version: rule.version });
      } else {
        const bulkError = errorById.get(rule.id);
        errors.push({
          item: asset,
          error: new Error(bulkError?.message ?? 'unknown error'),
        });
      }
    }
  }

  return { results, errors };
};
