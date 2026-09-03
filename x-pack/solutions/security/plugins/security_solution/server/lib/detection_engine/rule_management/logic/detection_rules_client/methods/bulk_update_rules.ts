/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkUpdateRulesParams, RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleParams } from '../../../../rule_schema';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import type {
  BulkUpdateRulesArgs,
  BulkUpdateRulesResult,
} from '../detection_rules_client_interface';

interface BulkUpdateRulesOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  args: BulkUpdateRulesArgs;
}

export const bulkUpdateRules = async ({
  actionsClient,
  rulesClient,
  args: { rules, batchSize, exitEarlyOnError, allowMissingConnectorSecrets, changeTracking },
}: BulkUpdateRulesOptions): Promise<BulkUpdateRulesResult> => {
  if (rules.length === 0) {
    return { successfulIds: [], errors: [], total: 0 };
  }

  const bulkInputs: BulkUpdateRulesParams<RuleParams>['rules'] = [];
  const errors: BulkUpdateRulesResult['errors'] = [];

  for (const rule of rules) {
    try {
      bulkInputs.push({
        id: rule.id,
        data: convertRuleResponseToAlertingRule(rule, actionsClient),
      });
    } catch (e) {
      errors.push({
        message: e instanceof Error ? e.message : String(e),
        rule: { id: rule.id, name: rule.name },
      });
    }
  }

  if (bulkInputs.length === 0) {
    return { successfulIds: [], errors, total: rules.length };
  }

  const result = await rulesClient.bulkUpdateRules<RuleParams>({
    rules: bulkInputs,
    batchSize,
    exitEarlyOnError,
    allowMissingConnectorSecrets,
    changeTracking,
  });

  return {
    successfulIds: result.successfulIds,
    errors: [...errors, ...result.errors],
    total: rules.length,
  };
};
