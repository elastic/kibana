/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  GetBehavioralSummaryRequestBody,
  GetBehavioralSummaryRequestParams,
} from '../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID, BEHAVIOR_DETAILS_INTERNAL_URL } from '../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { withMinimumLicense } from '../utils/with_minimum_license';
import { getAnomaliesFromDetailsIndex } from './get_anomaly_details';

export const registerBehavioralSummaryRoutes = ({
  router,
  logger,
  ml,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .post({
      access: 'internal',
      path: BEHAVIOR_DETAILS_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: GetBehavioralSummaryRequestParams,
            body: GetBehavioralSummaryRequestBody,
          },
        },
      },
      withMinimumLicense(async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entity_id: entityId } = request.params;
          const { page = 1, pageSize = 100, from, jobIds, sort } = request.body ?? {};

          const secSol = await context.securitySolution;
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;
          const soClient = core.savedObjects.client;

          const namespace = secSol.getSpaceId();

          const anomalies = await getAnomaliesFromDetailsIndex({
            esClient,
            entityId,
            fromMs: from,
            jobIds,
            logger,
            ml,
            namespace,
            offset: (page - 1) * pageSize,
            pageSize,
            sort,
            soClient,
          });

          return response.ok({
            body: {
              entityId,
              anomalies,
            },
          });
        } catch (err) {
          logger.error(`Error retrieving behavioral summary - ${err}`);

          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }, 'platinum')
    );
};
