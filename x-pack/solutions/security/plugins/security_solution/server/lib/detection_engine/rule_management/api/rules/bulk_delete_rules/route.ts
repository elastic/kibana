/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedRouteConfig } from '@kbn/core-http-server';
import type {
  DocLinksServiceSetup,
  IKibanaResponse,
  Logger,
  RequestHandler,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type {
  BulkDeleteRulesPostResponse,
  BulkDeleteRulesResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import {
  BulkCrudRulesResponse,
  BulkDeleteRulesPostRequestBody,
  BulkDeleteRulesRequestBody,
  validateQueryRuleByIds,
} from '../../../../../../../common/api/detection_engine/rule_management';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_BULK_DELETE,
} from '../../../../../../../common/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../../../types';
import {
  buildSiemResponse,
  createBulkErrorObject,
  transformBulkError,
} from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { getIdBulkError } from '../../../utils/utils';
import { transformValidateBulkError } from '../../../utils/validate';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';
import { RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS } from '../../timeouts';

type Handler = RequestHandler<
  unknown,
  unknown,
  BulkDeleteRulesRequestBody | BulkDeleteRulesPostRequestBody,
  SecuritySolutionRequestHandlerContext,
  'delete' | 'post'
>;

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 *
 * TODO: https://github.com/elastic/kibana/issues/193184 Delete this route and clean up the code
 */
export const bulkDeleteRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  docLinks: DocLinksServiceSetup
) => {
  const handler: Handler = async (
    context,
    request,
    response
  ): Promise<IKibanaResponse<BulkDeleteRulesResponse | BulkDeleteRulesPostResponse>> => {
    logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_DELETE);

    const siemResponse = buildSiemResponse(response);

    try {
      const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);

      const rulesClient = await ctx.alerting.getRulesClient();
      const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const { id, rule_id: ruleId } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          const validationErrors = validateQueryRuleByIds(payloadRule);
          if (validationErrors.length) {
            return createBulkErrorObject({
              ruleId: idOrRuleIdOrUnknown,
              statusCode: 400,
              message: validationErrors.join(),
            });
          }

          try {
            const rule = await readRules({ rulesClient, id, ruleId });
            if (!rule) {
              return getIdBulkError({ id, ruleId });
            }

            await detectionRulesClient.deleteRule({
              ruleId: rule.id,
            });

            return transformValidateBulkError(idOrRuleIdOrUnknown, rule);
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );

      return response.ok({
        body: BulkCrudRulesResponse.parse(rules),
        headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_DELETE),
      });
    } catch (err) {
      const error = transformError(err);
      return siemResponse.error({
        body: error.message,
        headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_DELETE),
        statusCode: error.statusCode,
      });
    }
  };

  const routeConfig: VersionedRouteConfig<'post' | 'delete'> = {
    access: 'public',
    path: DETECTION_ENGINE_RULES_BULK_DELETE,
    options: {
      timeout: {
        idleSocket: RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS,
      },
    },
    security: {
      authz: { requiredPrivileges: ['securitySolution'] },
    },
  };

  const securityDocLinks = docLinks.links.securitySolution;

  router.versioned.delete(routeConfig).addVersion(
    {
      version: '2023-10-31',
      validate: {
        request: {
          body: buildRouteValidationWithZod(BulkDeleteRulesRequestBody),
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
    handler
  );

  router.versioned.post(routeConfig).addVersion(
    {
      version: '2023-10-31',
      validate: {
        request: {
          body: buildRouteValidationWithZod(BulkDeleteRulesPostRequestBody),
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
    handler
  );
};
