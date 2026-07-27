/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WATCHES_URL } from '@kbn/pnd-common';
import type { ListWatchesResponse } from '@kbn/pnd-common';
import { MOCK_MANAGED_WATCHES } from '@kbn/pnd-common';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

export const registerListWatchesRoute = ({
  router,
  logger,
  config,
  getSpaceId,
  getWatchProjection,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_WATCHES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'List PND watches',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      async (context, request, response) => {
        try {
          if (config.ui.useMockData) {
            const body: ListWatchesResponse = { watches: MOCK_MANAGED_WATCHES };
            return response.ok({ body });
          }

          const projection = getWatchProjection?.();
          if (!projection) {
            return response.ok({ body: { watches: [] } });
          }

          const projected = await projection.list(getSpaceId(request));

          // Enrich with real activity metrics derived from Investigation/Proposal
          // documents (the actual event stream Watches produce). The workflow
          // projection itself leaves runs7d/acceptedPct as null since raw
          // workflow-execution telemetry is unavailable on stacks where
          // workflows are installed but have never fired.
          const store = getInvestigationStore?.();
          if (store) {
            try {
              const esClient = (await context.core).elasticsearch.client.asCurrentUser;
              const metricsByWatch = await store.getWatchActivityMetrics(
                esClient,
                projected.watches.map((w) => w.id)
              );
              const enriched: ListWatchesResponse = {
                watches: projected.watches.map((watch) => {
                  const metrics = metricsByWatch[watch.id];
                  if (!metrics) return watch;
                  return {
                    ...watch,
                    metrics: {
                      ...watch.metrics,
                      runs7d: metrics.runs7d,
                      acceptedPct: metrics.acceptedPct,
                      lastRun: metrics.lastRun ?? watch.metrics.lastRun,
                    },
                  };
                }),
              };
              return response.ok({ body: enriched });
            } catch (error) {
              logger.debug(`Failed to enrich watch activity metrics: ${error}`);
              return response.ok({ body: projected });
            }
          }

          return response.ok({ body: projected });
        } catch (error) {
          logger.error(`Failed to list watches: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list watches' },
          });
        }
      }
    );
};
