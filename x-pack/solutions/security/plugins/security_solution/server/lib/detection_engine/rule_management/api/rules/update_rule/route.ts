/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { validateRuleResponseActions } from '../../../../../../endpoint/services';
import type { UpdateRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  UpdateRuleRequestBody,
  validateUpdateRuleProps,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { getIdError } from '../../../utils/utils';

export const updateRuleRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .put({
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
            body: buildRouteValidationWithZod(UpdateRuleRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<UpdateRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateUpdateRuleProps(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }
        try {
          const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'licensing']);
          const rulesClient = await ctx.alerting.getRulesClient();
          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

          checkDefaultRuleExceptionListReferences({ exceptionLists: request.body.exceptions_list });

          await validateRuleDefaultExceptionList({
            exceptionsList: request.body.exceptions_list,
            rulesClient,
            ruleRuleId: request.body.rule_id,
            ruleId: request.body.id,
          });

          const existingRule = await readRules({
            rulesClient,
            ruleId: request.body.rule_id,
            id: request.body.id,
          });

          if (existingRule == null) {
            const error = getIdError({ id: request.body.id, ruleId: request.body.rule_id });
            return siemResponse.error({
              body: error.message,
              statusCode: error.statusCode,
            });
          }

          await validateRuleResponseActions({
            endpointAuthz: await ctx.securitySolution.getEndpointAuthz(),
            endpointService: ctx.securitySolution.getEndpointService(),
            rulePayload: request.body,
            spaceId: ctx.securitySolution.getSpaceId(),
            existingRule,
          });

          const updatedRule = await detectionRulesClient.updateRule({
            ruleUpdate: request.body,
          });

          return response.ok({
            body: updatedRule,
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
