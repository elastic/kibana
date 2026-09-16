/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkUpdateRulesParams, RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RuleResponse } from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../../../../prebuilt_rules';
import type { RuleParams } from '../../../../../rule_schema';
import { convertRuleResponseToAlertingRule } from '../../converters/convert_rule_response_to_alerting_rule';
import { applyRuleUpdate } from '../../mergers/apply_rule_update';
import { createRuleImportErrorObject } from './errors';
import type { IPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type {
  ImportRuleSuccess,
  ImportRuleError,
  ImportableRuleData,
  ImportRulesOptions,
  ImportRulesResult,
} from './types';

interface OverwriteRulesParams {
  rules: ImportableRuleData[];
  existingRules: Record<string, RuleResponse>;
  matchingAssetsByRuleId: Record<string, PrebuiltRuleAsset>;
  options: ImportRulesOptions;
  deps: OverwriteRulesDeps;
}

interface OverwriteRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
}

export async function overwriteRules({
  rules,
  existingRules,
  matchingAssetsByRuleId,
  options,
  deps,
}: OverwriteRulesParams): Promise<ImportRulesResult> {
  const { actionsClient, rulesClient, prebuiltRuleAssetClient } = deps;
  const successes: ImportRuleSuccess[] = [];
  const errors: ImportRuleError[] = [];
  const pending = new Map<string, ImportRuleSuccess>();
  const bulkInputs: BulkUpdateRulesParams<RuleParams>['rules'] = [];
  const toEnable: string[] = [];
  const toDisable: string[] = [];

  for (const { rule, immutable, ruleSource, exceptionsList } of rules) {
    const existingRule = existingRules[rule.rule_id];

    try {
      let updated = await applyRuleUpdate({
        prebuiltRuleAssetClient,
        existingRule,
        // The rule must carry the checked exceptions list with references to
        // non-existent exception lists removed and `id` fields pointing at
        // the lists installed in this cluster.
        ruleUpdate: { ...rule, exceptions_list: [...(exceptionsList ?? [])] },
        matchingAsset: matchingAssetsByRuleId[rule.rule_id] ?? null, // null = already looked, missing
      });
      // applyRuleUpdate prefers the existing rule's values for `rule_source` and `immutable`, but we want to use the importing rule's calculated values
      updated = { ...updated, rule_source: ruleSource, immutable };

      const requestedEnabled = rule.enabled ?? existingRule.enabled;
      if (!existingRule.enabled && requestedEnabled) {
        toEnable.push(existingRule.id);
      } else if (existingRule.enabled && !requestedEnabled) {
        toDisable.push(existingRule.id);
      }

      pending.set(existingRule.id, {
        rule_id: rule.rule_id,
        telemetry: {
          id: existingRule.id,
          type: rule.type,
          rule_source: ruleSource,
        },
      });
      bulkInputs.push({
        id: existingRule.id,
        data: convertRuleResponseToAlertingRule(updated, actionsClient),
      });
    } catch (e) {
      errors.push(
        createRuleImportErrorObject({
          ruleId: rule.rule_id,
          message: e instanceof Error ? e.message : String(e),
        })
      );
    }
  }

  if (bulkInputs.length === 0) {
    return { successes, errors };
  }

  const { successfulIds, errors: bulkErrors } = await rulesClient.bulkUpdateRules<RuleParams>({
    rules: bulkInputs,
    batchSize: options.batchSize,
    allowMissingConnectorSecrets: options.allowMissingConnectorSecrets,
    changeTracking: options.changeTracking,
  });

  const successIds = new Set(successfulIds);
  const { errors: toggleErrors, failedIds } = await toggleImportedEnabled({
    rulesClient,
    pending,
    enableIds: toEnable.filter((id) => successIds.has(id)),
    disableIds: toDisable.filter((id) => successIds.has(id)),
  });

  for (const id of successfulIds) {
    const source = pending.get(id);
    if (source != null && !failedIds.has(id)) {
      successes.push(source);
    }
  }

  for (const err of bulkErrors) {
    const failed = pending.get(err.rule.id);
    if (failed != null) {
      errors.push(
        createRuleImportErrorObject({
          ruleId: failed.rule_id,
          message: err.message,
        })
      );
    }
  }

  errors.push(...toggleErrors);
  return { successes, errors };
}

const toggleImportedEnabled = async ({
  rulesClient,
  pending,
  enableIds,
  disableIds,
}: {
  rulesClient: RulesClient;
  pending: Map<string, ImportRuleSuccess>;
  enableIds: string[];
  disableIds: string[];
}): Promise<{ errors: ImportRuleError[]; failedIds: Set<string> }> => {
  const errors: ImportRuleError[] = [];
  const failedIds = new Set<string>();

  if (enableIds.length > 0) {
    const { errors: enableErrors } = await rulesClient.bulkEnableRules({ ids: enableIds });
    for (const err of enableErrors) {
      failedIds.add(err.rule.id);
      const source = pending.get(err.rule.id);
      if (source != null) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: source.rule_id,
            message: err.message,
          })
        );
      }
    }
  }

  if (disableIds.length > 0) {
    const { errors: disableErrors } = await rulesClient.bulkDisableRules({ ids: disableIds });
    for (const err of disableErrors) {
      failedIds.add(err.rule.id);
      const source = pending.get(err.rule.id);
      if (source != null) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: source.rule_id,
            message: err.message,
          })
        );
      }
    }
  }

  return { errors, failedIds };
};
