/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup, IKibanaResponse, Logger } from '@kbn/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  DETECTION_ENGINE_RULES_BULK_CREATE,
  DETECTION_ENGINE_RULES_IMPORT_URL,
} from '../../../../../../../common/constants';
import {
  BulkCreateRulesRequestBody,
  validateCreateRuleProps,
  BulkCrudRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { getDuplicates } from './get_duplicates';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { validateRulesWithDuplicatedDefaultExceptionsList } from '../../../logic/exceptions/validate_rules_with_duplicated_default_exceptions_list';
import { RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS } from '../../timeouts';
import {
  transformBulkError,
  createBulkErrorObject,
  buildSiemResponse,
} from '../../../../routes/utils';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 *
 * TODO: https://github.com/elastic/kibana/issues/193184 Delete this route and clean up the code
 */
export const bulkCreateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  docLinks: DocLinksServiceSetup
) => {
  const securityDocLinks = docLinks.links.securitySolution;

  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_BULK_CREATE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        timeout: {
          idleSocket: RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(BulkCreateRulesRequestBody),
          },
        },
        options: {
          deprecated: {
            documentationUrl: securityDocLinks.legacyRuleManagementBulkApiDeprecations,
            severity: 'warning',
            reason: {
              type: 'migrate',
              newApiMethod: 'POST',
              newApiPath: DETECTION_ENGINE_RULES_IMPORT_URL,
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<BulkCrudRulesResponse>> => {
        logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_CREATE);

        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'securitySolution', 'licensing', 'alerting']);
          const rulesClient = await ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

          const ruleDefinitions = request.body;
          const dupes = getDuplicates(ruleDefinitions, 'rule_id');

          const rules = await Promise.all(
            ruleDefinitions
              .filter((rule) => rule.rule_id == null || !dupes.includes(rule.rule_id))
              .map(async (payloadRule) => {
                if (payloadRule.rule_id != null) {
                  const rule = await readRules({
                    id: undefined,
                    rulesClient,
                    ruleId: payloadRule.rule_id,
                  });
                  if (rule != null) {
                    return createBulkErrorObject({
                      ruleId: payloadRule.rule_id,
                      statusCode: 409,
                      message: `rule_id: "${payloadRule.rule_id}" already exists`,
                    });
                  }
                }

                try {
                  validateRulesWithDuplicatedDefaultExceptionsList({
                    allRules: request.body,
                    exceptionsList: payloadRule.exceptions_list,
                    ruleId: payloadRule.rule_id,
                  });

                  await validateRuleDefaultExceptionList({
                    exceptionsList: payloadRule.exceptions_list,
                    rulesClient,
                    ruleRuleId: payloadRule.rule_id,
                    ruleId: undefined,
                  });

                  const validationErrors = validateCreateRuleProps(payloadRule);
                  if (validationErrors.length) {
                    return createBulkErrorObject({
                      ruleId: payloadRule.rule_id,
                      statusCode: 400,
                      message: validationErrors.join(),
                    });
                  }

                  const createdRule = await detectionRulesClient.createCustomRule({
                    params: payloadRule,
                  });

                  return createdRule;
                } catch (err) {
                  return transformBulkError(
                    payloadRule.rule_id,
                    err as Error & { statusCode?: number }
                  );
                }
              })
          );

          const rulesBulk = [
            ...rules,
            ...dupes.map((ruleId) =>
              createBulkErrorObject({
                ruleId,
                statusCode: 409,
                message: `rule_id: "${ruleId}" already exists`,
              })
            ),
          ];
          return response.ok({
            body: BulkCrudRulesResponse.parse(rulesBulk),
            headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_CREATE),
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_CREATE),
            statusCode: error.statusCode,
          });
        }
      }
    );
};
