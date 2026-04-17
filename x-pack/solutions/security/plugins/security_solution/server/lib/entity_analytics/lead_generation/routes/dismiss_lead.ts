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

import { DISMISS_LEAD_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import { dismissLeadRequestSchema } from '../../../../../common/entity_analytics/lead_generation/types';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { APP_ID } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createLeadDataClient } from '../lead_data_client';
import { withMinimumLicense } from '../../utils/with_minimum_license';

export const dismissLeadRoute = (router: EntityAnalyticsRoutesDeps['router'], logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: DISMISS_LEAD_URL,
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
            params: buildRouteValidationWithZod(dismissLeadRequestSchema),
          },
        },
      },

      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { getSpaceId } = await context.securitySolution;
          const spaceId = getSpaceId();
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const leadDataClient = createLeadDataClient({ esClient, logger, spaceId });
          const dismissed = await leadDataClient.dismissLead(request.params.id);

          if (!dismissed) {
            return siemResponse.error({
              statusCode: 404,
              body: `Lead ${request.params.id} not found`,
            });
          }

          return response.ok({ body: { success: true } });
        } catch (e) {
          logger.error(`[LeadGeneration] Error dismissing lead: ${e}`);
          const error = transformError(e);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      })
    );
};
