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

import { WATCHLISTS_DATA_SOURCE_URL } from '../../../../../../../common/constants';
import { WatchlistDataSources } from '../../../../../../../common/api/entity_analytics';

import type { EntityAnalyticsRoutesDeps } from '../../../../types';
import { withMinimumLicense } from '../../../../utils/with_minimum_license';

export const createEntitySourceRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: WATCHLISTS_DATA_SOURCE_URL,
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
            params: WatchlistDataSources.CreateWatchlistEntitySourceRequestParams,
            body: WatchlistDataSources.CreateWatchlistEntitySourceRequestBody,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<WatchlistDataSources.CreateWatchlistEntitySourceResponse>> => {
          const siemResponse = buildSiemResponse(response);
          const monitoringSource = request.body;
          try {
            if (monitoringSource.type !== 'index') {
              // currently we own the integration sources so we don't allow creation of other types
              // we might allow this in the future if we have a way to manage the integration sources
              return siemResponse.error({
                statusCode: 400,
                body: 'Cannot currently create entity source of type other than index',
              });
            }

            const secSol = await context.securitySolution;
            const client = secSol.getMonitoringEntitySourceDataClient();

            const body = await client.create(monitoringSource);

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error creating monitoring entity source sync config: ${error.message}`);
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
