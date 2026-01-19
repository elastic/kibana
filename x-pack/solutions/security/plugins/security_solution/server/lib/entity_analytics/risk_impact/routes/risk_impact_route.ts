/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { RISK_IMPACT_URL } from '../../../../../common/entity_analytics/risk_impact/constants';
import { APP_ID } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { getRiskImpactMockData, getAllMockEntities } from '../get_risk_impact_mock_data';

export const riskImpactRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  // GET single entity details or list of all entities
  router.versioned
    .get({
      access: 'internal',
      path: RISK_IMPACT_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              entity_type: schema.maybe(
                schema.oneOf([
                  schema.literal('service'),
                  schema.literal('host'),
                  schema.literal('user'),
                ])
              ),
              entity_name: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        const { entity_type, entity_name } = request.query;

        try {
          // If no params, return list of all entities
          if (!entity_type || !entity_name) {
            const entities = getAllMockEntities();
            return response.ok({ body: { entities } });
          }

          // Otherwise return specific entity details
          const mockData = getRiskImpactMockData(entity_type, entity_name);
          return response.ok({ body: mockData });
        } catch (error) {
          logger.error(`Error fetching risk impact data: ${error}`);
          return siemResponse.error({
            statusCode: 500,
            body: { message: String(error) },
          });
        }
      }
    );
};
