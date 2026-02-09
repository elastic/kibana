/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { DETECTION_ENGINE_RULES_URL_HISTORY } from '../../../../../../../common/constants';
import type { RuleHistoryResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import { RuleHistoryRequestQuery } from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { getRuleHistory } from '../../../logic/history/get_history';

export const getRuleHistoryRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL_HISTORY,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(RuleHistoryRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<RuleHistoryResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const { id: ruleId, page, per_page: perPage } = request.query;

        if (!ruleId) {
          return siemResponse.error({ statusCode: 400, body: 'Invalid rule id' });
        }

        try {
          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);

          const { experimentalFeatures } = ctx.securitySolution.getConfig();
          if (!experimentalFeatures.ruleChangeHistoryEnabled) {
            return siemResponse.error({
              statusCode: 404,
              body: 'Not found',
            });
          }

          // What if client not initialized?
          const client = await ctx.alerting.getRulesClient();
          const { startDate, total, items } = await getRuleHistory({
            client,
            ruleId,
            page,
            perPage,
          });
          const body = { startDate, total, page, perPage, items };

          return response.ok({ body });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
