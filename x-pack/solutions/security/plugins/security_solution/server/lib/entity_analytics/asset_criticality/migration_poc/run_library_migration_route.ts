/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getMigrationStatus, reconcile } from '@kbn/es-index-migration';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';
import { ENTITY_ANALYTICS_INTERNAL_RUN_LIBRARY_MIGRATION_ROUTE } from '../../../../../common/entity_analytics/migrations/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { assetCriticalityMigration } from './asset_criticality_migration';

/**
 * Proof of concept: runs the declared Asset Criticality migration for the current space.
 *
 * Mirrors the existing `/migrations/run` route, which drives the hand-written path, so
 * the two can be invoked in separate spaces and the resulting mappings compared. Both
 * write to `.asset-criticality-<space>`, which is what keeps them isolated without either
 * implementation needing to know about the other.
 */
export const assetCriticalityLibraryMigrationRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: EntityAnalyticsRoutesDeps['logger']
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_ANALYTICS_INTERNAL_RUN_LIBRARY_MIGRATION_ROUTE,
      // Lets the version be given as `?apiVersion=1`. Dev Tools cannot set the
      // `elastic-api-version` header, and driving this POC by hand from the console is
      // the whole point of the route.
      enableQueryVersion: true,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics-manage`],
        },
      },
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: {} },
      async (context, request, response) => {
        const securitySolution = await context.securitySolution;
        const siemResponse = buildSiemResponse(response);

        try {
          const namespace = securitySolution.getSpaceId();
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

          // Captured first so the response shows the gap the run was starting from, not
          // the one it ended at - otherwise a successful migration looks like a no-op.
          const before = await getMigrationStatus({
            definition: assetCriticalityMigration,
            esClient,
            namespaces: [namespace],
          });

          const result = await reconcile({
            definition: assetCriticalityMigration,
            esClient,
            logger,
            namespace,
          });

          return response.ok({
            body: {
              result,
              versionsBehindBefore: before.versionsBehind,
              target: before.target,
            },
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
