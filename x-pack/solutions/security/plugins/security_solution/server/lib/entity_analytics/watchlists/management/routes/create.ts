/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { WATCHLIST_API_CALL_EVENT } from '../../../../telemetry/event_based/events';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import type { CreateWatchlistResponse } from '../../../../../../common/api/entity_analytics';
import { CreateWatchlistRequestBody } from '../../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID } from '../../../../../../common/constants';
import { WATCHLISTS_URL } from '../../../../../../common/entity_analytics/watchlists/constants';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { withMinimumLicense } from '../../../utils/with_minimum_license';
import { WatchlistConfigClient } from '../watchlist_config';
import { WatchlistEntitySourceClient } from '../../entity_sources/infra';
import { getRequestSavedObjectClient } from '../../shared/utils';
import {
  buildWatchlistApiCallSuccessFields,
  reportWatchlistApiCallError,
} from './watchlist_ebt_helpers';

export const createWatchlistRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  telemetrySender: ITelemetryEventsSender
) => {
  router.versioned
    .post({
      access: 'public',
      path: WATCHLISTS_URL,
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
            body: CreateWatchlistRequestBody,
          },
        },
      },
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<CreateWatchlistResponse>> => {
          const siemResponse = buildSiemResponse(response);
          try {
            const secSol = await context.securitySolution;
            const core = await context.core;
            const namespace = secSol.getSpaceId();
            const soClient = getRequestSavedObjectClient(core);

            const watchlistClient = new WatchlistConfigClient({
              logger,
              namespace,
              soClient,
              esClient: core.elasticsearch.client.asCurrentUser,
              internalEsClient: core.elasticsearch.client.asInternalUser,
            });

            const { entitySources: entitySourceInputs, ...watchlistInput } = request.body;

            // Step 1: Create the watchlist
            const watchlist = await watchlistClient.create(watchlistInput);
            if (!watchlist.id) {
              throw new Error('Watchlist creation succeeded but no ID was returned');
            }

            // Step 2: If entity sources were provided, create and link them (with rollback)
            if (entitySourceInputs?.length) {
              const sourceClient = new WatchlistEntitySourceClient({
                soClient,
                namespace,
              });

              const createdSources = [];
              try {
                for (const entitySourceInput of entitySourceInputs) {
                  const entitySource = await sourceClient.create(entitySourceInput);
                  await watchlistClient.addEntitySourceReference(watchlist.id, entitySource.id);
                  createdSources.push(entitySource);
                }
                telemetrySender.reportEBT(
                  WATCHLIST_API_CALL_EVENT,
                  buildWatchlistApiCallSuccessFields(
                    request.route.path,
                    request.body,
                    watchlist.id,
                    {
                      count: createdSources.length,
                      types: entitySourceInputs.map((s) => s.type),
                    }
                  )
                );
                return response.ok({
                  body: { ...watchlist, entitySources: createdSources },
                });
              } catch (e) {
                logger.error(
                  `Entity source creation failed, rolling back watchlist ${watchlist.id}`
                );
                await watchlistClient.delete(watchlist.id);
                throw e;
              }
            }

            telemetrySender.reportEBT(
              WATCHLIST_API_CALL_EVENT,
              buildWatchlistApiCallSuccessFields(request.route.path, request.body, watchlist.id, {
                count: 0,
              })
            );
            return response.ok({ body: watchlist });
          } catch (e) {
            const error = transformError(e);
            logger.error(`Failed to create watchlist: ${error.message}`);
            reportWatchlistApiCallError(telemetrySender, {
              path: request.route.path,
              errorMessage: error.message,
            });
            return siemResponse.error({
              body: error.message,
              statusCode: error.statusCode,
            });
          }
        },
        'platinum'
      )
    );
};
