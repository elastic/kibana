/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { isEmpty } from 'lodash';
import type { BulkEditResult } from '@kbn/alerting-plugin/server/rules_client/common/bulk_edit/types';
import type {
  RulePatchProps,
  RuleResponse,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import type { IPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { getIdError } from '../../../utils/utils';
import { validateNonCustomizablePatchFields } from '../../../utils/validate';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import {
  ClientError,
  validateMlAuth,
  isKeyUpdateableWithReadPermission,
  toggleRuleEnabledOnUpdate,
  formatBulkEditResultErrors,
} from '../utils';
import { getRuleByIdOrRuleId } from './get_rule_by_id_or_rule_id';
import { patchReadAuthEditRuleFields } from './rbac_methods/patch_rule_with_read_privileges';
import type { RuleParams } from '../../../../rule_schema';
import { applyRulePatch } from '../mergers/apply_rule_patch';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';

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
  const { rule_id: ruleId, id, ...rulePatchObjWithoutIds } = rulePatch;

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

  /**
   * RBAC logic branch
   *
   * Certain fields on the rule object are still able to be modified even if the user only has read permissions,
   * given they have crud permissions for the specific fields they're modifying.
   *
   * If all fields in the PATCH request (besides id/rule_id) are included in the `ValidReadAuthEditFields` type,
   * we check if the user has read authz privileges for the fields and use the `bulkEditRuleParamsWithReadAuth` method
   * provided by the alerting rules client to update the rule fields individually. Otherwise the user will
   * need `all` privileges for rules.
   */
  if (
    !isEmpty(rulePatchObjWithoutIds) &&
    Object.keys(rulePatchObjWithoutIds).every((key) => isKeyUpdateableWithReadPermission(key))
  ) {
    const appliedPatchWithReadPrivs: BulkEditResult<RuleParams> = await patchReadAuthEditRuleFields(
      {
        rulesClient,
        // Don't want to pass ID fields to the read authz PATCH method as it will apply patches on all fields in the object
        rulePatch: rulePatchObjWithoutIds,
        existingRule,
        prebuiltRuleAssetClient,
      }
    );

    const patchErrors = formatBulkEditResultErrors(appliedPatchWithReadPrivs);
    if (patchErrors) {
      throw new Error(patchErrors);
    }

    return convertAlertingRuleToRuleResponse(appliedPatchWithReadPrivs.rules[0]);
  } else {
    const patchedRule = await applyRulePatch({
      prebuiltRuleAssetClient,
      existingRule,
      rulePatch,
    });

    const patchedInternalRule = await rulesClient.update({
      id: existingRule.id,
      data: convertRuleResponseToAlertingRule(patchedRule, actionsClient),
    });

    const { enabled } = await toggleRuleEnabledOnUpdate(rulesClient, existingRule, patchedRule);

    return convertAlertingRuleToRuleResponse({ ...patchedInternalRule, enabled });
  }
};
