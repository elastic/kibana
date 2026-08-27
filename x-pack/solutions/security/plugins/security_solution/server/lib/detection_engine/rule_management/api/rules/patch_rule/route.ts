/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT,
  ENABLE_DISABLE_RULES_API_PRIVILEGE,
  EXCEPTIONS_API_ALL,
  INVESTIGATION_GUIDE_API_EDIT,
  RULES_API_ALL,
} from '@kbn/security-solution-features/constants';
import { validateRuleResponseActions } from '../../../../../../endpoint/services';
import type {
  PatchRuleRequestBody,
  PatchRuleResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { validatePatchRuleRequestBody } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  RuleObjectId,
  RuleSignatureId,
} from '../../../../../../../common/api/detection_engine/model/rule_schema';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { validateRulePatchByRuleType } from '../../../utils/validate';
import { getIdError } from '../../../utils/utils';

/**
 * Validates only the rule selector at the route boundary and preserves all other keys.
 * The body cannot be validated against the `RulePatchProps` union here: `type` is optional
 * in PATCH bodies, so a typeless body matches the union's first branch (EQL) and strip-mode
 * parsing silently drops the actual type's specific fields (e.g. `threshold`). Full
 * validation happens in the handler via `validateRulePatchByRuleType` once the existing
 * rule — and therefore its type — is known.
 */
const PatchRuleLooseRequestBody = z.looseObject({
  id: RuleObjectId.optional(),
  rule_id: RuleSignatureId.optional(),
});

export const patchRuleRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .patch({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                RULES_API_ALL,
                EXCEPTIONS_API_ALL,
                CUSTOM_HIGHLIGHTED_FIELDS_API_EDIT,
                INVESTIGATION_GUIDE_API_EDIT,
                ENABLE_DISABLE_RULES_API_PRIVILEGE,
              ],
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
            body: buildRouteValidationWithZod(PatchRuleLooseRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PatchRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        // Presence/pairing checks only; the full type-specific validation runs below once the
        // existing rule is read.
        const validationErrors = validatePatchRuleRequestBody(request.body as PatchRuleRequestBody);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }
        try {
          const { id, rule_id: ruleId } = request.body;
          const securitySolutionCtx = await context.securitySolution;

          const rulesClient = await (await context.alerting).getRulesClient();
          const detectionRulesClient = securitySolutionCtx.getDetectionRulesClient();

          const existingRule = await readRules({
            rulesClient,
            ruleId,
            id,
          });

          if (!existingRule) {
            const error = getIdError({ id, ruleId });
            return siemResponse.error({
              body: error.message,
              statusCode: error.statusCode,
            });
          }

          // `existingRule` is the internal alerting rule: the detection rule type lives on
          // its params, not on the top-level `type` (which is the alerting rule type id).
          const params = validateRulePatchByRuleType(request.body, existingRule.params.type);

          await validateRuleResponseActions({
            endpointAuthz: await securitySolutionCtx.getEndpointAuthz(),
            endpointService: securitySolutionCtx.getEndpointService(),
            rulePayload: params,
            spaceId: securitySolutionCtx.getSpaceId(),
            existingRule,
            checkOsqueryResponseActionAuthz:
              securitySolutionCtx.getCheckOsqueryResponseActionAuthz(),
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
