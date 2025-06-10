/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { pickBy } from 'lodash';
import { invariant } from '../../../../../../common/utils/invariant';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import {
  ThreeWayDiffOutcome,
  type GetPrebuiltRuleBaseVersionRequest,
  type GetPrebuiltRuleBaseVersionResponseBody,
  type PartialRuleDiff,
  type ThreeWayDiff,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import type { CalculateRuleDiffResult } from '../../logic/diff/calculate_rule_diff';
import { calculateRuleDiff } from '../../logic/diff/calculate_rule_diff';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { getRuleById } from '../../../rule_management/logic/detection_rules_client/methods/get_rule_by_id';

export const getPrebuiltRuleBaseVersionHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, GetPrebuiltRuleBaseVersionRequest>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const { id } = request.body;

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

    const ruleDiff = calculateRuleDiff({
      current: currentRule,
      base: undefined, // Base version is undefined, we're using the actual base version as the target version as we want to revert the rule
      target: baseRule,
    });

    const { diff, baseVersion, currentVersion } = formatDiffResponse(ruleDiff);

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

const formatDiffResponse = (
  diffResult: CalculateRuleDiffResult
): { diff: PartialRuleDiff; baseVersion: RuleResponse; currentVersion: RuleResponse } => {
  const { ruleDiff, ruleVersions } = diffResult;
  const installedCurrentVersion = ruleVersions.input.current;
  const baseVersion = ruleVersions.input.target;
  invariant(installedCurrentVersion != null, 'installedCurrentVersion not found');
  invariant(baseVersion != null, 'baseVersion not found');

  const baseRule: RuleResponse = {
    ...convertPrebuiltRuleAssetToRuleResponse(baseVersion),
    id: installedCurrentVersion.id,
  };

  return {
    baseVersion: baseRule,
    currentVersion: installedCurrentVersion,
    diff: {
      fields: pickBy<ThreeWayDiff<unknown>>(
        ruleDiff.fields,
        (fieldDiff) =>
          fieldDiff.diff_outcome !== ThreeWayDiffOutcome.StockValueNoUpdate &&
          fieldDiff.diff_outcome !== ThreeWayDiffOutcome.MissingBaseNoUpdate
      ),
      num_fields_with_updates: ruleDiff.num_fields_with_updates,
      num_fields_with_conflicts: ruleDiff.num_fields_with_conflicts,
      num_fields_with_non_solvable_conflicts: ruleDiff.num_fields_with_non_solvable_conflicts,
    },
  };
};
