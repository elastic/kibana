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

import { WATCHLISTS_ENTITY_MEMBERSHIPS_URL } from '../../../../../../../common/entity_analytics/watchlists/constants';
import { API_VERSIONS } from '../../../../../../../common/entity_analytics/constants';
import {
  GetEntityWatchlistMembershipsRequestQuery,
  type GetEntityWatchlistMembershipsResponse,
} from '../../../../../../../common/api/entity_analytics/watchlists/entities/memberships.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../../types';
import { withMinimumLicense } from '../../../../utils/with_minimum_license';
import { getWatchlistSavedObjectClient } from '../../../shared/utils';
import { getEntityWatchlistMemberships } from '../../../entities/memberships';

export const getEntityWatchlistMembershipsRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'internal',
      path: WATCHLISTS_ENTITY_MEMBERSHIPS_URL,
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
            query: GetEntityWatchlistMembershipsRequestQuery,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<GetEntityWatchlistMembershipsResponse>> => {
          const siemResponse = buildSiemResponse(response);
          try {
            const secSol = await context.securitySolution;
            const core = await context.core;

            const memberships = await getEntityWatchlistMemberships({
              esClient: core.elasticsearch.client.asCurrentUser,
              soClient: getWatchlistSavedObjectClient(core),
              namespace: secSol.getSpaceId(),
              euid: request.query.euid,
            });

            return response.ok({ body: { memberships } });
          } catch (e) {
            logger.error(`[WatchlistEntityMemberships] Error reading memberships: ${e}`);
            const error = transformError(e);
            return siemResponse.error({ statusCode: error.statusCode, body: error.message });
          }
        },
        'platinum'
      )
    );
};
