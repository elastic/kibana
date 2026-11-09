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

import { WATCHLISTS_DATA_SOURCE_UPDATE_API_KEY_URL } from '../../../../../../../common/constants';
import { WatchlistDataSources } from '../../../../../../../common/api/entity_analytics';

import type { EntityAnalyticsRoutesDeps } from '../../../../types';
import { withMinimumLicense } from '../../../../utils/with_minimum_license';
import { WatchlistEntitySourceClient } from '../../../entity_sources/infra';
import { getWatchlistSavedObjectClient } from '../../../shared/utils';

const UPDATE_API_KEY_AUDIT_ACTION = 'watchlist_entity_source_update_api_key';

const authz = {
  requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
};

export const updateEntitySourceApiKeyRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  hasEncryptionKey: EntityAnalyticsRoutesDeps['hasEncryptionKey']
) => {
  router.versioned
    .post({
      access: 'public',
      path: WATCHLISTS_DATA_SOURCE_UPDATE_API_KEY_URL,
      summary: 'Update the API key of an entity source',
      security: { authz },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: WatchlistDataSources.UpdateWatchlistEntitySourceApiKeyRequestParams,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<
          IKibanaResponse<WatchlistDataSources.UpdateWatchlistEntitySourceApiKeyResponse>
        > => {
          const siemResponse = buildSiemResponse(response);
          const { id, watchlist_id: watchlistId } = request.params;
          const core = await context.core;
          const audit = (outcome: 'success' | 'failure') =>
            core.security.audit.logger.log({
              message:
                outcome === 'success'
                  ? `User re-granted the API key of watchlist entity source [${id}]`
                  : `User failed to re-grant the API key of watchlist entity source [${id}]`,
              event: {
                action: UPDATE_API_KEY_AUDIT_ACTION,
                category: ['configuration'],
                type: ['change'],
                outcome,
              },
              labels: { watchlist_id: watchlistId, entity_source_id: id },
            });

          try {
            const secSol = await context.securitySolution;
            const client = new WatchlistEntitySourceClient({
              soClient: getWatchlistSavedObjectClient(core),
              namespace: secSol.getSpaceId(),
              esClient: core.elasticsearch.client.asCurrentUser,
              getStartServices,
              logger,
              hasEncryptionKey,
            });

            const body = await client.rotateApiKey(id, request);
            audit('success');
            return response.ok({ body });
          } catch (e) {
            audit('failure');
            const error = transformError(e);
            logger.error(`Error updating watchlist entity source API key: ${error.message}`);
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
