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
import { ClientError, validateMlAuth } from '../utils';
import { createRule } from './create_rule';
import { getRuleByRuleId } from './get_rule_by_rule_id';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';

export const upgradePrebuiltRule = async ({
  actionsClient,
  rulesClient,
  ruleAsset,
  mlAuthz,
  prebuiltRuleAssetClient,
  ruleCustomizationStatus,
}: {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  ruleAsset: PrebuiltRuleAsset;
  mlAuthz: MlAuthz;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}): Promise<RuleResponse> => {
  await validateMlAuth(mlAuthz, ruleAsset.type);

  const existingRule = await getRuleByRuleId({
    rulesClient,
    ruleId: ruleAsset.rule_id,
  });

  if (!existingRule) {
    throw new ClientError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
  }

  if (ruleAsset.type !== existingRule.type) {
    // If we're trying to change the type of a prepackaged rule, we need to delete the old one
    // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
    // and exception lists from the old rule
    await rulesClient.delete({ id: existingRule.id });

    const createdRule = await createRule({
      actionsClient,
      rulesClient,
      mlAuthz,
      rule: {
        ...ruleAsset,
        immutable: true,
        enabled: existingRule.enabled,
        exceptions_list: existingRule.exceptions_list,
        actions: existingRule.actions,
        timeline_id: existingRule.timeline_id,
        timeline_title: existingRule.timeline_title,
      },
      id: existingRule.id,
    });

    return createdRule;
  }

  // Else, recreate the rule from scratch with the passed payload.
  const updatedRule = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate: ruleAsset,
    ruleCustomizationStatus,
  });

  const updatedInternalRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(updatedRule, actionsClient),
  });

  return convertAlertingRuleToRuleResponse(updatedInternalRule);
};
