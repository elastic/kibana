/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  RULE_HISTORY_URL,
  RuleChangesHistoryRequestParams,
  RuleChangesHistoryRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { RuleChangesHistoryResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import { ENABLE_RULE_CHANGES_HISTORY_SETTING } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';

export const ruleHistoryRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: RULE_HISTORY_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(RuleChangesHistoryRequestParams),
            query: buildRouteValidationWithZod(RuleChangesHistoryRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<RuleChangesHistoryResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { ruleId } = request.params;
          const { page, per_page: perPage } = request.query;

          const ctx = await context.resolve(['core', 'securitySolution']);

          const isRuleChangesHistoryEnabled = await ctx.core.uiSettings.client.get<boolean>(
            ENABLE_RULE_CHANGES_HISTORY_SETTING
          );
          if (!isRuleChangesHistoryEnabled) {
            return siemResponse.error({
              statusCode: 403,
              body: 'Rule changes history is disabled. You may enable it in Advanced Settings.',
            });
          }

          const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

          const result = await detectionRulesClient.getHistoryForRule({
            ruleId,
            page,
            perPage,
          });

          return response.ok({ body: result });
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
