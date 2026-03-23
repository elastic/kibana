/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { WATCHLISTS_URL } from '../../../../../../common/entity_analytics/watchlists/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { withMinimumLicense } from '../../../utils/with_minimum_license';
import { GetWatchlistRequestParams as WatchlistIdParams } from '../../../../../../common/api/entity_analytics/watchlists/management/get.gen';
import { WatchlistConfigClient } from '../watchlist_config';
import { getRequestSavedObjectClient } from '../../shared/utils';

interface DeleteWatchlistResponse {
  deleted: true;
}

export const deleteWatchlistRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .delete({
      access: 'public',
      path: `${WATCHLISTS_URL}/{id}`,
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
            params: WatchlistIdParams,
          },
        },
      },
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<DeleteWatchlistResponse>> => {
          const siemResponse = buildSiemResponse(response);
          try {
            const secSol = await context.securitySolution;
            const core = await context.core;

            const watchlistClient = new WatchlistConfigClient({
              namespace: secSol.getSpaceId(),
              soClient: getRequestSavedObjectClient(core),
              esClient: core.elasticsearch.client.asCurrentUser,
              logger,
            });
            await watchlistClient.delete(request.params.id);
            return response.ok({ body: { deleted: true } });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Failed to delete watchlist: ${error.message}`);
            return siemResponse.error({
              body: { message: error.message },
              statusCode: error.statusCode,
            });
          }
        }
      )
    );
};
