/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { ALERTING_CLONE_API_KEY_HEADER } from '@kbn/alerting-plugin/common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { validateRuleResponseActions } from '../../../../../../endpoint/services';
import type { CreateRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  CreateRuleRequestBody,
  validateCreateRuleProps,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';

export const createRuleRoute = (router: SecuritySolutionPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL,

      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateRuleRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateCreateRuleProps(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const ctx = await context.resolve([
            'core',
            'securitySolution',
            'licensing',
            'alerting',
            'lists',
          ]);

          const rulesClient = await ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

          if (request.body.rule_id != null) {
            const rule = await readRules({
              rulesClient,
              ruleId: request.body.rule_id,
              id: undefined,
            });
            if (rule != null) {
              return siemResponse.error({
                statusCode: 409,
                body: `rule_id: "${request.body.rule_id}" already exists`,
              });
            }
          }

          checkDefaultRuleExceptionListReferences({
            exceptionLists: request.body.exceptions_list,
          });

          await validateRuleDefaultExceptionList({
            exceptionsList: request.body.exceptions_list,
            rulesClient,
            ruleRuleId: undefined,
            ruleId: undefined,
          });

          await validateRuleResponseActions({
            endpointAuthz: await ctx.securitySolution.getEndpointAuthz(),
            endpointService: ctx.securitySolution.getEndpointService(),
            rulePayload: request.body,
            spaceId: ctx.securitySolution.getSpaceId(),
            checkOsqueryResponseActionAuthz:
              ctx.securitySolution.getCheckOsqueryResponseActionAuthz(),
          });

          // A Kibana-internal caller running on a borrowed API key (e.g. an Agent Builder task)
          // declares it with this header so the rule is minted its own key instead of keeping the
          // caller's. Detection Engine creates via RulesClient, not the alerting HTTP create route,
          // so it must forward the directive itself.
          const cloneApiKey = request.headers?.[ALERTING_CLONE_API_KEY_HEADER] === 'true';

          const createdRule = await detectionRulesClient.createCustomRule({
            params: request.body,
            ...(cloneApiKey ? { cloneApiKey } : {}),
          });

          return response.ok({
            body: createdRule,
          });
        } catch (err) {
          const error = transformError(err as Error);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
