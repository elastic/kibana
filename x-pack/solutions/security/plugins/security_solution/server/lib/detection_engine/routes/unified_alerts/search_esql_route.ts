/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_ESQL_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

const SearchUnifiedAlertsEsqlRequestBody = z.object({
  query: z.string(),
});

type SearchUnifiedAlertsEsqlRequestBody = z.infer<typeof SearchUnifiedAlertsEsqlRequestBody>;

export const searchUnifiedAlertsEsqlRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_ESQL_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [ALERTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SearchUnifiedAlertsEsqlRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const siemResponse = buildSiemResponse(response);

        const { query } = request.body;

        if (!query) {
          return siemResponse.error({
            statusCode: 400,
            body: 'ES|QL query is required',
          });
        }

        try {
          // All filters are included in the ES|QL query itself
          const result = (await esClient.esql.query({
            query,
            drop_null_columns: true,
          })) as unknown as ESQLSearchResponse;

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
