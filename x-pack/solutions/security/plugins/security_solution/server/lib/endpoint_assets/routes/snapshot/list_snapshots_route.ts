/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { ENDPOINT_ASSETS_ROUTES } from '../../../../../common/endpoint_assets';
import type { ListSnapshotsResponse } from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';

/**
 * Entity Store snapshot index pattern for host entities.
 * Format: .entities.v1.history.{YYYY-MM-DD}.security_host_{namespace}
 */
const ENTITY_STORE_SNAPSHOT_PATTERN = '.entities.v1.history.*.security_host_*';

export const registerListSnapshotsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SNAPSHOT_LIST,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Query all Entity Store host snapshot indices
          const indicesResponse = await esClient.cat.indices({
            index: ENTITY_STORE_SNAPSHOT_PATTERN,
            format: 'json',
            h: 'index,docs.count',
          });

          // Extract dates from index names and build response
          // Format: .entities.v1.history.2026-01-14.security_host_default → "2026-01-14"
          const dateRegex = /\.entities\.v1\.history\.(\d{4}-\d{2}-\d{2})\.security_host_/;

          const snapshots = indicesResponse
            .map((indexInfo) => {
              const indexName = indexInfo.index as string;
              const dateMatch = indexName.match(dateRegex);

              if (!dateMatch) {
                return null;
              }

              return {
                date: dateMatch[1],
                index_name: indexName,
                document_count: parseInt(indexInfo['docs.count'] as string, 10) || 0,
              };
            })
            .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null)
            .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

          const listResponse: ListSnapshotsResponse = {
            snapshots,
          };

          return response.ok({
            body: listResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error listing Entity Store snapshots: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
