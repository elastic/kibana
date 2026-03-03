/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { APP_ID } from '@kbn/security-solution-features/constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';

import { WATCHLISTS_DATA_SOURCE_LIST_URL } from '../../../../../../../common/constants';
import { WatchlistDataSources } from '../../../../../../../common/api/entity_analytics';

import type { EntityAnalyticsRoutesDeps } from '../../../../types';
import { withMinimumLicense } from '../../../../utils/with_minimum_license';

export const listEntitySourcesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: WATCHLISTS_DATA_SOURCE_LIST_URL,
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
            params: WatchlistDataSources.ListWatchlistEntitySourcesRequestParams,
            query: buildRouteValidationWithZod(
              WatchlistDataSources.ListWatchlistEntitySourcesRequestQuery
            ),
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<WatchlistDataSources.ListWatchlistEntitySourcesResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const client = secSol.getMonitoringEntitySourceDataClient();
            const body = await client.list(request.query);

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error listing watchlist entity sources: ${error.message}`);
            return siemResponse.error({
              statusCode: error.statusCode,
              body: error.message,
            });
          }
        },
        'platinum'
      )
    );
};
