/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type {
  RulePatchProps,
  RuleResponse,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { getIdError } from '../../../utils/utils';
import { validateNonCustomizablePatchFields } from '../../../utils/validate';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { ClientError, validateMlAuth, patchApplicator } from '../utils';
import { getRuleByIdOrRuleId } from './get_rule_by_id_or_rule_id';

interface PatchRuleOptions {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  rulePatch: RulePatchProps;
  mlAuthz: MlAuthz;
}

export const patchRule = async ({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  rulePatch,
  mlAuthz,
}: PatchRuleOptions): Promise<RuleResponse> => {
  const { rule_id: ruleId, id, ...rulePatchObj } = rulePatch;

  const existingRule = await getRuleByIdOrRuleId({
    rulesClient,
    ruleId,
    id,
  });

  if (existingRule == null) {
    const error = getIdError({ id, ruleId });
    throw new ClientError(error.message, error.statusCode);
  }

  await validateMlAuth(mlAuthz, rulePatch.type ?? existingRule.type);

  validateNonCustomizablePatchFields(rulePatch, existingRule);

  const appliedInternalPatches = await patchApplicator(
    rulesClient,
    actionsClient,
    rulePatchObj,
    existingRule,
    prebuiltRuleAssetClient
  );
  return convertAlertingRuleToRuleResponse(appliedInternalPatches);
};
