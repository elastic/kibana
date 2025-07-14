/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getErrorMessage, getErrorStatusCode } from '../../../../../utils/error_helpers';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type {
  BulkActionReversionSkipResult,
  type RevertPrebuiltRulesRequest,
  type RevertPrebuiltRulesResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import {
  normalizeErrorResponse,
  type BulkActionError,
} from '../../../rule_management/api/rules/bulk_actions/bulk_actions_response';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { revertPrebuiltRules } from '../../logic/rule_objects/revert_prebuilt_rules';
import { getConcurrencyErrors } from './get_concurrrency_errors';
import { filterOutNonRevertableRules } from './filter_out_non_revertable_rules';
import { getRuleById } from '../../../rule_management/logic/detection_rules_client/methods/get_rule_by_id';
import { createBulkActionError } from '../../../rule_management/utils/utils';

export const revertPrebuiltRuleHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, RevertPrebuiltRulesRequest>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const { id, revision, version } = request.body;

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);

    const concurrencySet = { [id]: { revision, version } };

    const updated: RuleResponse[] = [];
    const errors: BulkActionError[] = [];

    const ruleResponse = await getRuleById({ rulesClient, id });

    if (!ruleResponse) {
      errors.push(
        createBulkActionError({
          id,
          message: `Cannot find rule with id: ${id}`,
          statusCode: 404,
        })
      );

      // Return early as there's no reason to continue if we can't find the rule
      return buildRuleReversionResponse(response, {
        updated,
        skipped: [],
        errors,
      });
    }

    const { rulesToRevert, skipped } = filterOutNonRevertableRules([ruleResponse]);

    const prebuiltRuleAssets = await ruleAssetsClient.fetchAssetsByVersion(rulesToRevert);
    const ruleVersionsMap = zipRuleVersions(rulesToRevert, [], prebuiltRuleAssets); // We use base versions as target param as we are reverting rules
    const revertableRules: RuleTriad[] = [];

    rulesToRevert.forEach((rule) => {
      const ruleVersions = ruleVersionsMap.get(rule.rule_id);
      const currentVersion = ruleVersions?.current;
      const baseVersion = ruleVersions?.target;

      if (!currentVersion) {
        errors.push(
          createBulkActionError({
            id: rule.id,
            message: `Cannot find rule with id: ${rule.id}`,
            statusCode: 404,
          })
        );
        return;
      }

      if (!baseVersion) {
        errors.push(
          createBulkActionError({
            id: rule.id,
            message: `Cannot find base_version for rule id: ${rule.id}`,
            statusCode: 404,
          })
        );
        return;
      }

      const concurrencyError = getConcurrencyErrors(
        concurrencySet[rule.id].revision,
        concurrencySet[rule.id].version,
        rule
      );
      if (concurrencyError) {
        errors.push(concurrencyError);
        return;
      }

      revertableRules.push({
        current: currentVersion,
        target: baseVersion, // Use base version as target to revert rule
      });
    });

    const { results: revertResults, errors: revertErrors } = await revertPrebuiltRules(
      detectionRulesClient,
      revertableRules
    );

    const formattedUpdateErrors = revertErrors.map(({ error, item }) => {
      return {
        message: getErrorMessage(error),
        status: getErrorStatusCode(error),
        rule: item.current,
      };
    });

    errors.push(...formattedUpdateErrors);
    updated.push(...revertResults.map(({ result }) => result));

    return buildRuleReversionResponse(response, {
      updated,
      skipped,
      errors,
    });
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};

// Similar to `buildBulkResponse` in /bulk_actions_response.ts but the `RevertPrebuiltRulesResponseBody` type has a slightly different return body
// If we extend the revert route this can be folded into the existing buildBuleResponse function
const buildRuleReversionResponse = (
  response: KibanaResponseFactory,
  {
    updated,
    skipped,
    errors,
  }: {
    updated: RuleResponse[];
    skipped: BulkActionReversionSkipResult[];
    errors: BulkActionError[];
  }
): IKibanaResponse<RevertPrebuiltRulesResponseBody> => {
  const numSucceeded = updated.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  const results = {
    updated,
    skipped,
    created: [],
    deleted: [],
  };

  if (numFailed > 0) {
    const message =
      summary.succeeded > 0 ? 'Rule reversion partially failed' : 'Rule reversion failed';
    return response.custom<RevertPrebuiltRulesResponseBody>({
      headers: { 'content-type': 'application/json' },
      body: {
        message,
        status_code: 500,
        attributes: {
          errors: normalizeErrorResponse(errors),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: RevertPrebuiltRulesResponseBody = {
    success: true,
    rules_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};
