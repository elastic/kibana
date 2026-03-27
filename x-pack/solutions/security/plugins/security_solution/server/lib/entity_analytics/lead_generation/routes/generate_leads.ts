/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';

import { GENERATE_LEADS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createLeadGenerationService } from '../services/lead_generation_service';

const GenerateLeadsRequestBody = z.object({
  mode: z.enum(['adhoc', 'scheduled']).optional().default('adhoc'),
});

export const generateLeadsRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: GENERATE_LEADS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(GenerateLeadsRequestBody),
          },
        },
      },

      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const service = createLeadGenerationService({
            esClient,
            logger,
            spaceId,
            entityStoreDataClient: securitySolution.getEntityStoreDataClient(),
            riskScoreDataClient: securitySolution.getRiskScoreDataClient(),
          });

          const result = await service.generate(request.body.mode ?? 'adhoc');

          return response.ok({ body: result });
        } catch (e) {
          logger.error(`[LeadGeneration] Error generating leads: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
