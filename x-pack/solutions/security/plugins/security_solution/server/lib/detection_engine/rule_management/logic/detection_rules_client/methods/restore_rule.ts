/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { isEqual } from 'lodash';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
// import { standardDiffDocCalculation } from '@kbn/change-history/src/utils';

import { RuleTypeSolutions, SecurityRuleChangeTrackingAction } from '@kbn/alerting-types';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { getRuleById } from './get_rule_by_id';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import type { RestoreRuleArgs } from '../detection_rules_client_interface';
import { validateMlAuth } from '../utils';

interface RestoreRuleOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  args: RestoreRuleArgs;
  mlAuthz: MlAuthz;
}

export const restoreRule = async ({
  actionsClient,
  rulesClient,
  args,
  mlAuthz,
}: RestoreRuleOptions): Promise<RuleResponse> => {
  const { ruleId, changeId } = args;

  const existingRule = await getRuleById({
    rulesClient,
    id: ruleId,
  });

  if (!existingRule) {
    throw new Error(`Invalid rule id ${ruleId}`);
  }

  await validateMlAuth(mlAuthz, existingRule.type);

  const module = RuleTypeSolutions.security;
  const history = await rulesClient.getHistoryForRule({ module, ruleId, changeId });
  const change = history.items.at(0);
  if (!change?.rule) {
    throw new Error(`Change id not found ${changeId}`);
  }

  const historicalRule = convertAlertingRuleToRuleResponse(change.rule);

  // TODO: Review this. Possibly error out with "no changes" if it makes sense.
  // const equal = isEqual(previousRule, existingRule);
  // const diff = standardDiffDocCalculation({ a: previousRule, b: existingRule );
  // console.log('previousRule', JSON.stringify(previousRule, null, 2));
  // console.log('existingRule', JSON.stringify(existingRule, null, 2));
  // console.log('equal', equal);
  // console.log('diff', JSON.stringify(diff));

  // TODO: Watch out for existing rule's values for `rule_source` and `immutable`, refer to importing rule's calculated values
  const { enabled, exceptions_list, execution_summary } = existingRule;
  const ruleWithUpdates = {
    ...existingRule,
    ...historicalRule,
    enabled,
    exceptions_list,
    execution_summary,
  } as RuleResponse;

  const updatedRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
    action: SecurityRuleChangeTrackingAction.ruleRestore,
    metadata: { originalRevision: historicalRule.revision },
    shouldIncrementRevision: () => true,
  });

  return convertAlertingRuleToRuleResponse(updatedRule);
};
