/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { EntityAnalyticsPrivileges } from '../../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { WATCHLISTS_PRIVILEGES_URL } from '../../../../../../common/entity_analytics/watchlists/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { getIndexForWatchlist } from '../../entities/utils';
import {
  _formatPrivileges,
  hasReadWritePermissions,
} from '../../../utils/check_and_format_privileges';
import { withMinimumLicense } from '../../../utils/with_minimum_license';

export const watchlistsPrivilegesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .get({
      access: 'public',
      path: WATCHLISTS_PRIVILEGES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<EntityAnalyticsPrivileges>> => {
          const siemResponse = buildSiemResponse(response);
          try {
            const secSol = await context.securitySolution;
            const namespace = secSol.getSpaceId();
            const [_, { security }] = await getStartServices();
            const watchlistsIndex = getIndexForWatchlist(namespace);
            const entityStoreIndex = getEntitiesAlias(ENTITY_LATEST, namespace);

            const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
            const { privileges, hasAllRequested } = await checkPrivileges({
              elasticsearch: {
                cluster: [],
                index: {
                  [watchlistsIndex]: ['read', 'write'],
                  [entityStoreIndex]: ['read', 'write'],
                },
              },
            });

            return response.ok({
              body: {
                privileges: _formatPrivileges(privileges),
                has_all_required: hasAllRequested,
                ...hasReadWritePermissions(privileges.elasticsearch, watchlistsIndex),
              },
            });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error checking watchlists privileges: ${error.message}`);
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
