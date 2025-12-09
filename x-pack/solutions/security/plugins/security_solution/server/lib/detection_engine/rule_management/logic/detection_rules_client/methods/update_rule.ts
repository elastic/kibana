/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { BulkEditResult } from '@kbn/alerting-plugin/server/rules_client/common/bulk_edit/types';

import type { TwoWayDiffRule } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/two_way_diff/two_way_rule_diff';
import type { RuleResponse } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { applyRuleUpdate } from '../mergers/apply_rule_update';
import { getIdError } from '../../../utils/utils';
import { validateNonCustomizableUpdateFields } from '../../../utils/validate';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import {
  ClientError,
  applyPatchRuleWithReadPrivileges,
  gatherErrors,
  isEveryReadKeyValid,
  toggleRuleEnabledOnUpdate,
  validateMlAuth,
} from '../utils';

import type { RuleUpdateProps } from '../../../../../../../common/api/detection_engine';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { getRuleByIdOrRuleId } from './get_rule_by_id_or_rule_id';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import type { RuleParams } from '../../../../rule_schema';
import { calculateRuleFieldsDiff } from '../../../../prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';

interface UpdateRuleArguments {
  actionsClient: ActionsClient;
  rulesClient: RulesClient;
  prebuiltRuleAssetClient: IPrebuiltRuleAssetsClient;
  ruleUpdate: RuleUpdateProps;
  mlAuthz: MlAuthz;
}

export const updateRule = async ({
  actionsClient,
  rulesClient,
  prebuiltRuleAssetClient,
  ruleUpdate,
  mlAuthz,
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

  // diff existing rule with "RULE UPDATE",
  // if the only thing that is changing is one of
  // the valid fields, then use the alerting read
  // authz update function.
  const ruleDiff = calculateRuleFieldsDiff({
    ruleA: existingRule,
    ruleB: ruleUpdate as RuleResponse,
    isUpdateRuleRoute: true,
  });

  // gather all modified fields from ruleDiff
  const modifiedFields = Object.keys(ruleDiff).filter(
    (field) => !ruleDiff[field as keyof TwoWayDiffRule].is_equal
  );

  // check if every key in ruleDiff is one of validFields
  // for alerting read authz bulk update function
  // if every modified field is in validFields,
  // use bulk update function with read authz
  if (modifiedFields.every((field) => isEveryReadKeyValid(field))) {
    const ruleUpdateWithOnlyValidModifiedFields = modifiedFields.reduce(
      (acc, field) => ({ ...acc, [field]: ruleUpdate[field as keyof RuleUpdateProps] }),
      {} as RuleUpdateProps
    );
    const appliedPatchesWithReadPrivs: Array<BulkEditResult<RuleParams>> =
      await applyPatchRuleWithReadPrivileges(
        rulesClient,
        ruleUpdateWithOnlyValidModifiedFields,
        existingRule
      );

    // gather and throw errors from bulk operation
    gatherErrors(appliedPatchesWithReadPrivs);
    return convertAlertingRuleToRuleResponse(appliedPatchesWithReadPrivs[0].rules[0]);
  }

  const ruleWithUpdates = await applyRuleUpdate({
    prebuiltRuleAssetClient,
    existingRule,
    ruleUpdate,
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
