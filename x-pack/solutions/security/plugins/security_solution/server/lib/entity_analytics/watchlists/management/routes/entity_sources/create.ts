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
import { WatchlistConfigClient } from '../../watchlist_config';
import { getRequestSavedObjectClient } from '../../../shared/utils';
import type { IntegrationType } from '../../../../privilege_monitoring/data_sources';
import {
  getStreamPatternFor,
  INTEGRATION_TYPES,
  integrationsSourceIndex,
  oktaLastFullSyncMarkersIndex,
} from '../../../../privilege_monitoring/data_sources';

const getLastFullSyncMarkersIndex = (namespace: string, integration: IntegrationType): string => {
  if (integration === 'entityanalytics_ad') {
    return getStreamPatternFor(integration, namespace);
  }
  return oktaLastFullSyncMarkersIndex(namespace);
};

const buildIntegrationSourceAttributes = (
  namespace: string,
  integrationName: IntegrationType
): WatchlistDataSources.CreateWatchlistEntitySourceRequestBody => ({
  type: 'entity_analytics_integration',
  name: integrationsSourceIndex(namespace, integrationName),
  indexPattern: getStreamPatternFor(integrationName, namespace),
  integrationName,
  enabled: true,
});

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
            const secSol = await context.securitySolution;
            const core = await context.core;
            const namespace = secSol.getSpaceId();
            const client = secSol.getMonitoringEntitySourceDataClient();

            let body: WatchlistDataSources.CreateWatchlistEntitySourceResponse;

            if (monitoringSource.type === 'entity_analytics_integration') {
              const integrationName = monitoringSource.integrationName;
              if (
                !integrationName ||
                !INTEGRATION_TYPES.includes(integrationName as IntegrationType)
              ) {
                return siemResponse.error({
                  statusCode: 400,
                  body: `integrationName is required and must be one of: ${INTEGRATION_TYPES.join(
                    ', '
                  )}`,
                });
              }

              const sourceAttrs = buildIntegrationSourceAttributes(
                namespace,
                integrationName as IntegrationType
              );
              const derivedName = sourceAttrs.name;

              const { sources } = await client.list({ name: derivedName, per_page: 1 });
              const existing = sources[0];

              if (existing) {
                body = existing;
              } else {
                const created = await client.create({
                  ...sourceAttrs,
                  integrations: {
                    syncMarkerIndex: getLastFullSyncMarkersIndex(
                      namespace,
                      integrationName as IntegrationType
                    ),
                  },
                });
                body = created;
              }
            } else {
              body = await client.create(monitoringSource);
            }

            const watchlistClient = new WatchlistConfigClient({
              logger,
              namespace,
              soClient: getRequestSavedObjectClient(core),
              esClient: core.elasticsearch.client.asCurrentUser,
            });
            await watchlistClient.addEntitySourceReference(request.params.watchlist_id, body.id);

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
