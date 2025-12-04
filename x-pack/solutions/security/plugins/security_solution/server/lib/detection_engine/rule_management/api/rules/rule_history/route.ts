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

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, page, per_page } = request.query;

        if (!id) {
          return siemResponse.error({ statusCode: 400, body: 'Invalid rule id' });
        }

        try {
          const { elasticsearch } = await context.core;

          // What if client not initialized?
          const result = await getRuleHistory({
            client: elasticsearch.client.asCurrentUser,
            ruleId: id,
            page,
            perPage: per_page,
          });

          const transformed = {
            total: Number(result.total) ?? 0,
            page,
            perPage: per_page,
            items: result.items,
          };

          return response.ok({ body: transformed ?? {} });
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
