/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../common';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth } from '../utils';

export interface BulkCreatePrebuiltRulesArgs {
  rules: PrebuiltRuleAsset[];
}

export interface BulkCreatePrebuiltRulesResult {
  results: Array<{ result: ReturnType<typeof convertAlertingRuleToRuleResponse> }>;
  errors: Array<{ item: PrebuiltRuleAsset; error: Error }>;
}

interface BulkCreatePrebuiltRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  args: BulkCreatePrebuiltRulesArgs;
}

/**
 * Bulk-installs prebuilt rules in a single `rulesClient.bulkCreateRules` call.
 * Prebuilt rules are always created disabled, so this never triggers Phase 3/5
 * (task scheduling/enable) on the alerting side.
 *
 * Returns the same `{ results, errors }` shape as `createPrebuiltRules` for
 * drop-in compatibility with `performRuleInstallationHandler`.
 */
export const bulkCreatePrebuiltRules = async ({
  actionsClient,
  rulesClient,
  mlAuthz,
  args,
}: BulkCreatePrebuiltRulesOptions): Promise<BulkCreatePrebuiltRulesResult> => {
  const { rules } = args;
  const results: BulkCreatePrebuiltRulesResult['results'] = [];
  const errors: BulkCreatePrebuiltRulesResult['errors'] = [];

  if (rules.length === 0) return { results, errors };

  // Per-type ML auth dedupe: each unique rule type is checked once.
  const checkedTypes = new Set<string>();
  const mlAuthErrorByType = new Map<string, Error>();
  for (const rule of rules) {
    if (!checkedTypes.has(rule.type)) {
      checkedTypes.add(rule.type);
      try {
        await validateMlAuth(mlAuthz, rule.type);
      } catch (e) {
        mlAuthErrorByType.set(rule.type, e instanceof Error ? e : new Error(String(e)));
      }
    }
  }

  // Pre-assign uuids so per-rule successes/failures from the alerting bulk call
  // can be re-paired with their input PrebuiltRuleAsset by id.
  const itemById = new Map<string, PrebuiltRuleAsset>();
  const bulkInputs: Array<{
    data: ReturnType<typeof convertRuleResponseToAlertingRule> & {
      alertTypeId: string;
      consumer: string;
      enabled: boolean;
    };
    options: { id: string };
  }> = [];

  for (const rule of rules) {
    const mlError = mlAuthErrorByType.get(rule.type);
    if (mlError) {
      errors.push({ item: rule, error: mlError });
    } else {
      const id = uuidv4();
      itemById.set(id, rule);
      const ruleWithDefaults = applyRuleDefaults({ ...rule, immutable: true });
      const data = {
        ...convertRuleResponseToAlertingRule(ruleWithDefaults, actionsClient),
        alertTypeId: ruleTypeMappings[rule.type],
        consumer: SERVER_APP_ID,
        enabled: false,
      };
      bulkInputs.push({ data, options: { id } });
    }
  }

  if (bulkInputs.length === 0) return { results, errors };

  const result = await rulesClient.bulkCreateRules<RuleParams>({ rules: bulkInputs });

  // Prebuilt rules are always created disabled, so background work is just key
  // invalidation flushing on error rows. Fire and forget; never rejects.
  void result.backgroundWork();

  result.rules.forEach((createdRule) => {
    results.push({ result: convertAlertingRuleToRuleResponse(createdRule) });
  });

  result.errors.forEach((err) => {
    const item = itemById.get(err.rule.id);
    if (!item) return;
    errors.push({
      item,
      error: Object.assign(new Error(err.message), { statusCode: err.status }),
    });
  });

  return { results, errors };
};
