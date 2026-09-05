/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BulkCreateRulesParams, RulesClient } from '@kbn/alerting-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../../../../common';
import type { SecurityRuleChangeTracking } from '../../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type {
  RuleObjectId,
  RuleSignatureId,
} from '../../../../../../../../common/api/detection_engine';
import type { RuleParams } from '../../../../../rule_schema';
import { convertRuleResponseToAlertingRule } from '../../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../../mergers/apply_rule_defaults';
import { createRuleImportErrorObject } from './errors';
import { RULE_IMPORT_BULK_CREATE_BATCH_SIZE } from '../../../../api/constants';
import type { ImportRuleSuccess, RuleImportErrorObject, ImportableRuleData } from './types';

interface CreateRulesParams {
  rules: ImportableRuleData[];
  options: CreateRulesOptions;
  deps: CreateRulesDeps;
}

interface CreateRulesOptions {
  allowMissingConnectorSecrets?: boolean;
  changeTracking?: SecurityRuleChangeTracking;
}

interface CreateRulesDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
}

type CreateRulesResult = Array<ImportRuleSuccess | RuleImportErrorObject>;

export async function createRules({
  rules,
  options,
  deps,
}: CreateRulesParams): Promise<CreateRulesResult> {
  const { actionsClient, rulesClient } = deps;

  const bulkInputs: BulkCreateRulesParams<RuleParams>['rules'] = [];
  const ruleIdsMap = new Map<RuleObjectId, RuleSignatureId>();
  const result: CreateRulesResult = [];

  for (const { rule, immutable, ruleSource, exceptionsList } of rules) {
    const id = uuidv4();

    try {
      const ruleResponse = applyRuleDefaults({
        ...rule,
        exceptions_list: [...(exceptionsList ?? [])],
        immutable,
        rule_source: ruleSource,
      });
      const data = {
        ...convertRuleResponseToAlertingRule(ruleResponse, actionsClient),
        alertTypeId: ruleTypeMappings[rule.type],
        consumer: SERVER_APP_ID,
        // Alerting mints the API key and schedules the task inline for enabled rules.
        enabled: rule.enabled ?? false,
      };

      bulkInputs.push({
        data,
        options: { id },
        allowMissingConnectorSecrets: options.allowMissingConnectorSecrets,
      });
      ruleIdsMap.set(id, rule.rule_id);
    } catch (e) {
      result.push(
        createRuleImportErrorObject({
          ruleId: rule.rule_id,
          message: e instanceof Error ? e.message : String(e),
        })
      );
    }
  }

  if (bulkInputs.length === 0) {
    return result;
  }

  const { successfulIds, errors: bulkErrors } = await rulesClient.bulkCreateRules<RuleParams>({
    rules: bulkInputs,
    batchSize: RULE_IMPORT_BULK_CREATE_BATCH_SIZE,
    changeTracking: options.changeTracking,
  });

  for (const id of successfulIds) {
    const ruleId = ruleIdsMap.get(id);

    if (ruleId != null) {
      result.push({ rule_id: ruleId });
    }
  }

  for (const err of bulkErrors) {
    const ruleId = ruleIdsMap.get(err.rule.id);

    if (ruleId != null) {
      result.push(
        createRuleImportErrorObject({
          ruleId,
          message: err.message,
        })
      );
    }
  }

  return result;
}
