/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_WATCH_URL_TEMPLATE,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

const GetWatchRequestParams = lazySchema(() =>
  z.object({
    watchId: z.string().min(1).max(128),
  })
);

export const registerGetWatchRoute = ({
  router,
  logger,
  getSpaceId,
  getWatchProjection,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_WATCH_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get a AlertZero watch by id',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetWatchRequestParams),
          },
        },
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        try {
          const { watchId } = request.params;
          const body = await getWatchesService().get(watchId, getSpaceId(request));
          if (!body) {
            return response.notFound({
              body: { message: `Watch "${watchId}" not found` },
            });
          }

          const result = await projection.get(watchId, getSpaceId(request));
          if (!result) {
            return response.notFound({
              body: { message: `Watch "${watchId}" not found` },
            });
          }

          // Enrich with real activity metrics — same source as the list route,
          // scoped to this one watch.
          const store = getInvestigationStore?.();
          if (store) {
            try {
              const esClient = (await context.core).elasticsearch.client.asCurrentUser;
              const metricsByWatch = await store.getWatchActivityMetrics(esClient, [watchId]);
              const metrics = metricsByWatch[watchId];
              if (metrics) {
                const body: GetWatchResponse = {
                  watch: {
                    ...result.watch,
                    metrics: {
                      ...result.watch.metrics,
                      runs7d: metrics.runs7d,
                      acceptedPct: metrics.acceptedPct,
                      lastRun: metrics.lastRun ?? result.watch.metrics.lastRun,
                    },
                  },
                };
                return response.ok({ body });
              }
            } catch (error) {
              logger.debug(`Failed to enrich watch activity metrics for ${watchId}: ${error}`);
            }
          }

          const body: GetWatchResponse = result;
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to get watch: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get watch' },
          });
        }
      })
    );
};
