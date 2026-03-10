/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';

import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { WATCHLISTS_ENTITIES_URL } from '../../../../../../common/entity_analytics/watchlists/constants';
import { WatchlistEntities } from '../../../../../../common/api/entity_analytics';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { withMinimumLicense } from '../../../utils/with_minimum_license';
import { WatchlistConfigClient } from '../../management/watchlist_config';
import { getRequestSavedObjectClient } from '../../shared/utils';
import { createWatchlistEntitiesService } from '../service';

export const addWatchlistEntitiesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: WATCHLISTS_ENTITIES_URL,
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
            params: WatchlistEntities.AddWatchlistEntitiesRequestParams,
            body: WatchlistEntities.AddWatchlistEntitiesRequestBody,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<WatchlistEntities.AddWatchlistEntitiesResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const core = await context.core;

            const watchlistClient = new WatchlistConfigClient({
              logger,
              namespace: secSol.getSpaceId(),
              soClient: getRequestSavedObjectClient(core),
              esClient: core.elasticsearch.client.asCurrentUser,
            });

            const watchlist = await watchlistClient.get(request.params.watchlist_id);
            const watchlistEntitiesService = createWatchlistEntitiesService({
              esClient: core.elasticsearch.client.asCurrentUser,
              namespace: secSol.getSpaceId(),
            });

            const body = await watchlistEntitiesService.add(watchlist, request.body);

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Failed to add entities to watchlist: ${error.message}`);
            return siemResponse.error({
              body: error.message,
              statusCode: error.statusCode,
            });
          }
        }
      )
    );
};
