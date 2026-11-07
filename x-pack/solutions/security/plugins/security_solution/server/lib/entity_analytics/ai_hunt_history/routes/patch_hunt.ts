/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { AI_HUNT_HISTORY_BY_ID_URL } from '../../../../../common/entity_analytics/ai_hunt_history/constants';
import {
  patchHuntParamsSchema,
  patchHuntRequestSchema,
} from '../../../../../common/entity_analytics/ai_hunt_history/types';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createHuntHistoryDataClient } from '../hunt_history_data_client';

export const patchHuntRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .patch({
      access: 'internal',
      path: AI_HUNT_HISTORY_BY_ID_URL,
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
            params: buildRouteValidationWithZod(patchHuntParamsSchema),
            body: buildRouteValidationWithZod(patchHuntRequestSchema),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const dataClient = createHuntHistoryDataClient({ esClient, logger, spaceId });
          const updated = await dataClient.patchHunt(request.params.id, request.body);

          if (!updated) {
            return siemResponse.error({
              statusCode: 404,
              body: `Hunt ${request.params.id} not found`,
            });
          }

          const { space, ...body } = updated;
          return response.ok({ body });
        } catch (e) {
          logger.error(`[AiHuntHistory] Error updating hunt: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
