/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { APP_ID } from '@kbn/security-solution-features/constants';

import { WATCHLISTS_MANUAL_ENTITIES_LIST_INTERNAL_URL } from '../../../../../../../common/entity_analytics/watchlists/constants';
import { API_VERSIONS } from '../../../../../../../common/entity_analytics/constants';
import {
  ListManualWatchlistEntitiesRequestParams,
  ListManualWatchlistEntitiesRequestQuery,
  type ListManualWatchlistEntitiesResponse,
} from '../../../../../../../common/api/entity_analytics/watchlists/entities/list_manual.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../../types';
import { withMinimumLicense } from '../../../../utils/with_minimum_license';
import { WatchlistConfigClient } from '../../watchlist_config';
import { listManualWatchlistEntities } from '../../../entity_sources/manual/service';
import { getIndexForWatchlist } from '../../../entities/utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;

export const listManualWatchlistEntitiesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'internal',
      path: WATCHLISTS_MANUAL_ENTITIES_LIST_INTERNAL_URL,
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
            params: ListManualWatchlistEntitiesRequestParams,
            query: ListManualWatchlistEntitiesRequestQuery,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<ListManualWatchlistEntitiesResponse>> => {
          const siemResponse = buildSiemResponse(response);
          try {
            const secSol = await context.securitySolution;
            const core = await context.core;
            const namespace = secSol.getSpaceId();

            const esClient = core.elasticsearch.client.asCurrentUser;
            const soClient = core.savedObjects.client;

            const watchlistClient = new WatchlistConfigClient({
              esClient,
              soClient,
              logger,
              namespace,
            });

            // Fails when the watchlist does not exist, so a missing watchlist is an error and not an empty list.
            const watchlist = await watchlistClient.get(request.params.watchlist_id);

            const result = await listManualWatchlistEntities(
              esClient,
              {
                id: watchlist.id || request.params.watchlist_id,
                index: getIndexForWatchlist(namespace),
              },
              {
                page: request.query.page ?? DEFAULT_PAGE,
                perPage: request.query.per_page ?? DEFAULT_PER_PAGE,
              }
            );

            return response.ok({ body: result });
          } catch (e) {
            logger.error(`[WatchlistManualEntitiesList] Error listing manual entities: ${e}`);
            const error = transformError(e);
            return siemResponse.error({ statusCode: error.statusCode, body: error.message });
          }
        },
        'platinum'
      )
    );
};
