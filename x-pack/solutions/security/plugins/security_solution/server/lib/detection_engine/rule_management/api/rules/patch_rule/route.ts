/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  EXCEPTIONS_API_ALL,
  RULES_API_ALL,
  RULES_API_READ,
} from '@kbn/security-solution-features/constants';
import { validateRuleResponseActions } from '../../../../../../endpoint/services';
import type { PatchRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  PatchRuleRequestBody,
  validatePatchRuleRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { getIdError } from '../../../utils/utils';

export const patchRuleRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .patch({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [RULES_API_ALL, { allOf: [RULES_API_READ, EXCEPTIONS_API_ALL] }],
            },
          ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            // Use non-exact validation because everything is optional in patch - since everything is optional,
            // io-ts can't find the right schema from the type specific union and the exact check breaks.
            // We do type specific validation after fetching the existing rule so we know the rule type.
            body: buildRouteValidationWithZod(PatchRuleRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PatchRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validatePatchRuleRequestBody(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }
        try {
          const params = request.body;
          const securitySolutionCtx = await context.securitySolution;

          const rulesClient = await (await context.alerting).getRulesClient();
          const detectionRulesClient = securitySolutionCtx.getDetectionRulesClient();

          const existingRule = await readRules({
            rulesClient,
            ruleId: params.rule_id,
            id: params.id,
          });

          if (!existingRule) {
            const error = getIdError({ id: params.id, ruleId: params.rule_id });
            return siemResponse.error({
              body: error.message,
              statusCode: error.statusCode,
            });
          }

          await validateRuleResponseActions({
            endpointAuthz: await securitySolutionCtx.getEndpointAuthz(),
            endpointService: securitySolutionCtx.getEndpointService(),
            rulePayload: request.body,
            spaceId: securitySolutionCtx.getSpaceId(),
            existingRule,
          });

          checkDefaultRuleExceptionListReferences({ exceptionLists: params.exceptions_list });
          await validateRuleDefaultExceptionList({
            exceptionsList: params.exceptions_list,
            rulesClient,
            ruleRuleId: params.rule_id,
            ruleId: params.id,
          });

          const patchedRule = await detectionRulesClient.patchRule({
            rulePatch: params,
          });

          return response.ok({
            body: patchedRule,
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
