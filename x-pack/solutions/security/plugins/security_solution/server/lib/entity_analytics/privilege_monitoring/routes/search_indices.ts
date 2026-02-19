/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { take } from 'lodash/fp';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { API_VERSIONS, APP_ID, PRIVMON_INDICES_URL } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { SearchPrivilegesIndicesRequestQuery } from '../../../../../common/api/entity_analytics/monitoring';
import { createDataSourcesService } from '../data_sources/data_sources_service';
import { PrivilegeMonitoringApiKeyType } from '../auth/saved_object';
import { monitoringEntitySourceType } from '../saved_objects';
import { withMinimumLicense } from '../../utils/with_minimum_license';

// Return a subset of all indices that contain the user.name field
const LIMIT = 20;

export const searchPrivilegeMonitoringIndicesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: PRIVMON_INDICES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(SearchPrivilegesIndicesRequestQuery),
          },
        },
      },
      withMinimumLicense(async (context, request, response): Promise<IKibanaResponse<{}>> => {
        const secSol = await context.securitySolution;
        const siemResponse = buildSiemResponse(response);
        const query = request.query.searchQuery;

        const dataClient = secSol.getPrivilegeMonitoringDataClient();
        const config = secSol.getConfig();
        const maxUsersAllowed =
          config.entityAnalytics.monitoring.privileges.users.maxPrivilegedUsersAllowed;
        const soClient = dataClient.getScopedSoClient(request, {
          includedHiddenTypes: [
            PrivilegeMonitoringApiKeyType.name,
            monitoringEntitySourceType.name,
          ],
        });
        const service = createDataSourcesService(dataClient, soClient, maxUsersAllowed);
        try {
          const indices = await service.searchPrivilegesIndices(query);

          return response.ok({
            body: take(LIMIT, indices),
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error searching privilege monitoring indices: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }, 'platinum')
    );
};
