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
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { RuleParams } from '../../../../rule_schema';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { validateMlAuth } from '../utils';

export interface BulkCreatePrebuiltRulesArgs {
  rules: PrebuiltRuleAsset[];
}

export interface BulkCreatePrebuiltRulesResultItem {
  id: string;
  rule_id: string;
  version: number;
}

export interface BulkCreatePrebuiltRulesResult {
  results: Array<{ result: BulkCreatePrebuiltRulesResultItem }>;
  errors: Array<{ item: PrebuiltRuleAsset; error: Error }>;
}

interface BulkCreatePrebuiltRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  args: BulkCreatePrebuiltRulesArgs;
}

// Bulk-installs prebuilt rules in a single `rulesClient.bulkCreateRules` call; alerting handles batching internally and only returns `successfulIds`, so we re-pair them with the input assets via a uuid map to derive `{ id, rule_id, version }`.
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

  const { successfulIds, errors: bulkErrors } = await rulesClient.bulkCreateRules<RuleParams>({
    rules: bulkInputs,
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleInstall,
      metadata: { bulkCount: rules.length },
    },
  });

  for (const id of successfulIds) {
    const asset = itemById.get(id);
    if (asset) {
      results.push({ result: { id, rule_id: asset.rule_id, version: asset.version } });
    }
  }

  bulkErrors.forEach((err) => {
    const item = itemById.get(err.rule.id);
    if (!item) return;
    errors.push({
      item,
      error: Object.assign(new Error(err.message), { statusCode: err.status }),
    });
  });

  return { results, errors };
};
