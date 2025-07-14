/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { pickBy } from 'lodash';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type {
  FullRuleDiff,
  ThreeWayDiffOutcome,
  type GetPrebuiltRuleBaseVersionRequest,
  type GetPrebuiltRuleBaseVersionResponseBody,
  type PartialRuleDiff,
  type ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { getRuleById } from '../../../rule_management/logic/detection_rules_client/methods/get_rule_by_id';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

export const getPrebuiltRuleBaseVersionHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, GetPrebuiltRuleBaseVersionRequest, undefined>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const { id } = request.query;

  try {
    const ctx = await context.resolve(['core', 'alerting']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);

    const currentRule = await getRuleById({ rulesClient, id });

    if (!currentRule) {
      throw new Error(`Cannot find rule with id: ${id}`);
    }

    const [baseRule] = await ruleAssetsClient.fetchAssetsByVersion([currentRule]);

    if (!baseRule) {
      return siemResponse.error({
        body: 'Cannot find rule base_version',
        statusCode: 404,
      });
    }

    const { ruleDiff } = calculateRuleDiff({
      current: currentRule,
      base: baseRule,
      target: baseRule, // We're using the base version as the target version as we want to revert the rule
    });

    const { diff, baseVersion, currentVersion } = formatDiffResponse({
      ruleDiff,
      baseRule,
      currentRule,
    });

    const body: GetPrebuiltRuleBaseVersionResponseBody = {
      diff,
      current_version: currentVersion,
      base_version: baseVersion,
    };

    return response.ok({ body });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};

const formatDiffResponse = ({
  ruleDiff,
  baseRule,
  currentRule,
}: {
  ruleDiff: FullRuleDiff;
  baseRule: PrebuiltRuleAsset;
  currentRule: RuleResponse;
}): { diff: PartialRuleDiff; baseVersion: RuleResponse; currentVersion: RuleResponse } => {
  const baseVersion: RuleResponse = {
    ...convertPrebuiltRuleAssetToRuleResponse(baseRule),
    id: currentRule.id,
    // Set all fields to the original Elastic version values
    created_at: currentRule.created_at,
    created_by: currentRule.created_by,
    updated_at: currentRule.created_at,
    updated_by: currentRule.created_by,
    revision: 0,
  };

  return {
    baseVersion,
    currentVersion: currentRule,
    diff: {
      ...ruleDiff,
      fields: pickBy<ThreeWayDiff<unknown>>(
        ruleDiff.fields,
        (fieldDiff) => fieldDiff.diff_outcome === ThreeWayDiffOutcome.CustomizedValueNoUpdate
      ),
    },
  };
};
