/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { getIdError } from '../../../utils/utils';
import { validateNonCustomizableUpdateFields } from '../../../utils/validate';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';

import { ClientError, toggleRuleEnabledOnUpdate, validateMlAuth } from '../utils';

import type { RuleUpdateProps } from '../../../../../../../common/api/detection_engine';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { getRuleByIdOrRuleId } from './get_rule_by_id_or_rule_id';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';

interface UpdateRuleArguments {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  ruleUpdate: RuleUpdateProps;
  mlAuthz: MlAuthz;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}

export const updateRule = async ({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  ruleUpdate,
  mlAuthz,
  ruleCustomizationStatus,
}: UpdateRuleArguments): Promise<RuleResponse> => {
  const { rule_id: ruleId, id } = ruleUpdate;

  await validateMlAuth(mlAuthz, ruleUpdate.type);

  const existingRule = await getRuleByIdOrRuleId({
    rulesClient,
    ruleId,
    id,
  });

  if (existingRule == null) {
    const error = getIdError({ id, ruleId });
    throw new ClientError(error.message, error.statusCode);
  }

  validateNonCustomizableUpdateFields(ruleUpdate, existingRule);

  const ruleWithUpdates = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate,
    ruleCustomizationStatus,
  });

  const updatedRule = await rulesClient.update({
    id: existingRule.id,
    data: convertRuleResponseToAlertingRule(ruleWithUpdates, actionsClient),
  });

  const { enabled } = await toggleRuleEnabledOnUpdate(rulesClient, existingRule, ruleWithUpdates);

  return convertAlertingRuleToRuleResponse({
    ...updatedRule,
    enabled,
  });
};
