/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SecurityRuleChangeTracking } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { SecurityRuleChangeTrackingAction } from '../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { PrebuiltRuleAsset } from '../../../../prebuilt_rules';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { ClientError, validateMlAuth, mergeExceptionLists } from '../utils';
import { createRule } from '../methods/create_rule';
import { getRuleByRuleId } from '../methods/get_rule_by_rule_id';

interface ApplyPrebuiltRuleAssetParams {
  asset: PrebuiltRuleAsset;
  deps: ApplyPrebuiltRuleAssetDeps;
  changeTracking?: SecurityRuleChangeTracking<never>;
}

interface ApplyPrebuiltRuleAssetDeps {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
}

/**
 * Applies a prebuilt rule asset directly to an installed prebuilt rule.
 *
 * Throws an error when the prebuilt rule isn't installed.
 *
 * In case prebuiltRuleAsset.type is equal to existingRule.type the rule
 * gets updated. Otherwise the rule gets re-installed.
 */
export async function applyPrebuiltRuleAsset({
  asset,
  deps: { actionsClient, rulesClient, mlAuthz, prebuiltRuleAssetClient },
  changeTracking,
}: ApplyPrebuiltRuleAssetParams): Promise<RuleResponse> {
  await validateMlAuth(mlAuthz, asset.type);

  const existingRule = await getRuleByRuleId({
    ruleId: asset.rule_id,
    rulesClient,
  });

  if (!existingRule) {
    throw new ClientError(`Failed to find rule ${asset.rule_id}`, 500);
  }

  if (asset.type !== existingRule.type) {
    // If we're trying to change the type of a prepackaged rule, we need to delete the old one
    // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
    // and exception lists from the old rule
    await rulesClient.delete({ id: existingRule.id });

    const createdRule = await createRule({
      rule: {
        ...asset,
        immutable: true,
        enabled: existingRule.enabled,
        exceptions_list: existingRule.exceptions_list,
        actions: existingRule.actions,
        timeline_id: existingRule.timeline_id,
        timeline_title: existingRule.timeline_title,
      },
      id: existingRule.id,
      deps: { actionsClient, rulesClient, mlAuthz },
      changeTracking: { action: SecurityRuleChangeTrackingAction.ruleUpgrade, ...changeTracking },
    });

    return createdRule;
  }

  const updatedRule = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate: asset,
  });

  // Preserve existing actions from the installed rule
  if (existingRule.actions.length) {
    updatedRule.actions = existingRule.actions;
  }

  const updatedRuleWithMergedExceptions = mergeExceptionLists(updatedRule, existingRule);

  const updatedInternalRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(updatedRuleWithMergedExceptions, actionsClient),
    changeTracking: {
      action: SecurityRuleChangeTrackingAction.ruleUpgrade,
      ...changeTracking,
    },
  });

  return convertAlertingRuleToRuleResponse(updatedInternalRule);
}
