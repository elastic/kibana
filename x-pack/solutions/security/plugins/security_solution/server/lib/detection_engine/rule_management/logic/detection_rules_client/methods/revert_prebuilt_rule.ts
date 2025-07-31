/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { validateMlAuth, mergeExceptionLists } from '../utils';

export const revertPrebuiltRule = async ({
  actionsClient,
  rulesClient,
  ruleAsset,
  mlAuthz,
  existingRule,
  prebuiltRuleAssetClient,
}: {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  ruleAsset: PrebuiltRuleAsset;
  mlAuthz: MlAuthz;
  existingRule: RuleResponse;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
}): Promise<RuleResponse> => {
  await validateMlAuth(mlAuthz, ruleAsset.type);
  const updatedRule = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate: ruleAsset,
  });

  // We want to preserve existing actions from existing rule on upgrade
  if (existingRule.actions.length) {
    updatedRule.actions = existingRule.actions;
  }

  const updatedRuleWithMergedExceptions = mergeExceptionLists(updatedRule, existingRule);

  const updatedInternalRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(updatedRuleWithMergedExceptions, actionsClient),
  });

  return convertAlertingRuleToRuleResponse(updatedInternalRule);
};
