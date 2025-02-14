/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup, IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  BulkUpdateRulesRequestBody,
  validateUpdateRuleProps,
  BulkCrudRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_BULK_UPDATE,
} from '../../../../../../../common/constants';
import { getIdBulkError } from '../../../utils/utils';
import {
  transformBulkError,
  buildSiemResponse,
  createBulkErrorObject,
} from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { validateRulesWithDuplicatedDefaultExceptionsList } from '../../../logic/exceptions/validate_rules_with_duplicated_default_exceptions_list';
import { RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS } from '../../timeouts';

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 *
 * TODO: https://github.com/elastic/kibana/issues/193184 Delete this route and clean up the code
 */
export const bulkUpdateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  docLinks: DocLinksServiceSetup
) => {
  const securityDocLinks = docLinks.links.securitySolution;

  router.versioned
    .put({
      access: 'public',
      path: DETECTION_ENGINE_RULES_BULK_UPDATE,
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
            body: buildRouteValidationWithZod(BulkUpdateRulesRequestBody),
          },
        },
        options: {
          deprecated: {
            documentationUrl: securityDocLinks.legacyRuleManagementBulkApiDeprecations,
            severity: 'warning',
            reason: {
              type: 'migrate',
              newApiMethod: 'POST',
              newApiPath: DETECTION_ENGINE_RULES_BULK_ACTION,
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<BulkCrudRulesResponse>> => {
        logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_UPDATE);

        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'licensing']);
          const rulesClient = await ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

          const rules = await Promise.all(
            request.body.map(async (payloadRule) => {
              const idOrRuleIdOrUnknown = payloadRule.id ?? payloadRule.rule_id ?? '(unknown id)';
              try {
                const validationErrors = validateUpdateRuleProps(payloadRule);
                if (validationErrors.length) {
                  return createBulkErrorObject({
                    ruleId: payloadRule.rule_id,
                    statusCode: 400,
                    message: validationErrors.join(),
                  });
                }

                const existingRule = await readRules({
                  rulesClient,
                  ruleId: payloadRule.rule_id,
                  id: payloadRule.id,
                });

                if (!existingRule) {
                  return getIdBulkError({ id: payloadRule.id, ruleId: payloadRule.rule_id });
                }

                validateRulesWithDuplicatedDefaultExceptionsList({
                  allRules: request.body,
                  exceptionsList: payloadRule.exceptions_list,
                  ruleId: idOrRuleIdOrUnknown,
                });
                await validateRuleDefaultExceptionList({
                  exceptionsList: payloadRule.exceptions_list,
                  rulesClient,
                  ruleRuleId: payloadRule.rule_id,
                  ruleId: payloadRule.id,
                });

                const updatedRule = await detectionRulesClient.updateRule({
                  ruleUpdate: payloadRule,
                });

                return updatedRule;
              } catch (err) {
                return transformBulkError(idOrRuleIdOrUnknown, err);
              }
            })
          );

          return response.ok({
            body: BulkCrudRulesResponse.parse(rules),
            headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_UPDATE),
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_UPDATE),
            statusCode: error.statusCode,
          });
        }
      }
    );
};
