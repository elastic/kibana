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
import { WatchlistEntitySourceClient } from '../../../entity_sources/infra';
import { getRequestSavedObjectClient } from '../../../shared/utils';
import {
  checkIndexReadPrivilege,
  grantEntitySourceApiKey,
  invalidateEntitySourceApiKey,
} from '../../../entity_sources/entity_source_api_key';

export const updateEntitySourceRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
) => {
  router.versioned
    .put({
      access: 'public',
      path: `${WATCHLISTS_DATA_SOURCE_URL}/{id}`,
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
            params: WatchlistDataSources.UpdateWatchlistEntitySourceRequestParams,
            body: WatchlistDataSources.UpdateWatchlistEntitySourceRequestBody,
          },
        },
      },
      withMinimumLicense(
        async (
          context,
          request,
          response
        ): Promise<IKibanaResponse<WatchlistDataSources.UpdateWatchlistEntitySourceResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const secSol = await context.securitySolution;
            const core = await context.core;
            const client = new WatchlistEntitySourceClient({
              soClient: getRequestSavedObjectClient(core),
              namespace: secSol.getSpaceId(),
            });

            const currentSource = await client.get(request.params.id);
            const wasIndex = currentSource.type === 'index';
            const newType = request.body.type ?? currentSource.type;
            const isNowIndex = newType === 'index';

            if (request.body.indexPattern && isNowIndex) {
              const hasPrivilege = await checkIndexReadPrivilege(
                core.elasticsearch.client.asCurrentUser,
                request.body.indexPattern
              );
              if (!hasPrivilege) {
                return siemResponse.error({
                  statusCode: 403,
                  body: `Insufficient privileges to read from index pattern: ${request.body.indexPattern}`,
                });
              }
            }

            const body = await client.update({ ...request.body, id: request.params.id });

            if (wasIndex || isNowIndex) {
              const [coreStart] = await getStartServices();

              if (wasIndex && currentSource.apiKeyId) {
                await invalidateEntitySourceApiKey(
                  coreStart.security,
                  currentSource.apiKeyId,
                  logger
                );
              }

              if (isNowIndex) {
                const apiKey = await grantEntitySourceApiKey(coreStart.security, request, {
                  id: request.params.id,
                  name: body.name ?? request.params.id,
                });
                if (apiKey) {
                  await client.updateApiKeyFields(request.params.id, apiKey);
                }
              } else {
                // Transitioning away from index: clear stale key reference
                await client.updateApiKeyFields(request.params.id, {
                  apiKeyId: null,
                  apiKey: null,
                });
              }
            }

            return response.ok({ body });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Error updating watchlist entity source config: ${error.message}`);
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
