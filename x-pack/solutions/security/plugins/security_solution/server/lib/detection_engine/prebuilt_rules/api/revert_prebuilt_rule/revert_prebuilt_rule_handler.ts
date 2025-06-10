/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getErrorMessage, getErrorStatusCode } from '../../../../../utils/error_helpers';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { BulkActionReversionSkipResult } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import {
  type RevertPrebuiltRulesRequest,
  type RevertPrebuiltRulesResponseBody,
  BulkRevertSkipReasonEnum,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionRequestHandlerContext } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';
import {
  normalizeErrorResponse,
  type BulkActionError,
} from '../../../rule_management/api/rules/bulk_actions/bulk_actions_response';
import { fetchRulesByQueryOrIds } from '../../../rule_management/api/rules/bulk_actions/fetch_rules_by_query_or_ids';
import { convertAlertingRuleToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_alerting_rule_to_rule_response';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';
import { zipRuleVersions } from '../../logic/rule_versions/zip_rule_versions';
import { revertPrebuiltRules } from '../../logic/rule_objects/revert_prebuilt_rules';

const MAX_RULES_TO_REVERT = 1;

export const revertPrebuiltRuleHandler = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<undefined, undefined, RevertPrebuiltRulesRequest>,
  response: KibanaResponseFactory
) => {
  const siemResponse = buildSiemResponse(response);
  const { id, revision, version } = request.body;
  const abortController = new AbortController();

  try {
    const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
    const soClient = ctx.core.savedObjects.client;
    const rulesClient = await ctx.alerting.getRulesClient();
    const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
    const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);

    const concurrencySet = { [id]: { revision, version } };

    const fetchRulesOutcome = await fetchRulesByQueryOrIds({
      rulesClient,
      query: undefined,
      ids: [id],
      abortSignal: abortController.signal,
      maxRules: MAX_RULES_TO_REVERT,
    });

    const rulesToRevert = fetchRulesOutcome.results.map(({ result }) =>
      convertAlertingRuleToRuleResponse(result)
    );
    const errors: BulkActionError[] = [...fetchRulesOutcome.errors];
    const updated: RuleResponse[] = [];
    const skipped: BulkActionReversionSkipResult[] = [];

    const baseRules = await ruleAssetsClient.fetchAssetsByVersion(rulesToRevert);
    const ruleVersionsMap = zipRuleVersions(rulesToRevert, [], baseRules); // We use base versions as target argument as we are reverting rules
    const revertableRules: RuleTriad[] = [];

    rulesToRevert.forEach((rule) => {
      const ruleVersions = ruleVersionsMap.get(rule.rule_id);

      const currentVersion = ruleVersions?.current;
      const baseVersion = ruleVersions?.target;

      if (!currentVersion) {
        errors.push({
          message: `Cannot find rule with id: ${rule.id}`,
          status: 404,
          rule,
        });
        return;
      }

      if (!baseVersion) {
        errors.push({
          message: `Cannot find base_version for rule id: ${rule.id}`,
          status: 404,
          rule,
        });
        return;
      }

      const concurrencyErrors = validateConcurrencyErrors(
        concurrencySet[rule.id].revision,
        concurrencySet[rule.id].version,
        rule
      );
      if (concurrencyErrors.length) {
        errors.push(...concurrencyErrors);
        return;
      }

      if (rule.rule_source.type !== 'external') {
        skipped.push({
          id: rule.id,
          skip_reason: BulkRevertSkipReasonEnum.RULE_NOT_PREBUILT,
        });
        return;
      } else if (rule.rule_source.type === 'external' && rule.rule_source.is_customized === false) {
        skipped.push({
          id: rule.id,
          skip_reason: BulkRevertSkipReasonEnum.RULE_NOT_CUSTOMIZED,
        });
        return;
      }

      revertableRules.push({
        current: currentVersion,
        target: baseVersion, // Use base version as target to revert rule
      });
    });

    const { results: upgradeResults, errors: installationErrors } = await revertPrebuiltRules(
      detectionRulesClient,
      revertableRules
    );

    const formattedInstallationErrors = installationErrors.map(({ error, item }) => {
      return {
        message: getErrorMessage(error),
        status: getErrorStatusCode(error),
        rule: item.current,
      };
    });

    errors.push(...formattedInstallationErrors);
    updated.push(...upgradeResults.map(({ result }) => result));

    if (abortController.signal.aborted === true) {
      throw new AbortError('Rule reversion was aborted');
    }

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

const validateConcurrencyErrors = (
  revision: number,
  version: number,
  rule: RuleResponse
): BulkActionError[] => {
  const errors: BulkActionError[] = [];
  if (rule.version !== version) {
    errors.push({
      message: `Version mismatch for id ${rule.id}: expected ${version}, got ${rule.version}`,
      status: 409,
      rule,
    });
  }

  if (rule.revision !== revision) {
    errors.push({
      message: `Revision mismatch for id ${rule.id}: expected ${revision}, got ${rule.revision}`,
      status: 409,
      rule,
    });
  }
  return errors;
};
