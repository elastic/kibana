/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import {
  ENDPOINT_ASSETS_ROUTES,
  SOFTWARE_INVENTORY_INDEX_PATTERN,
} from '../../../../../common/endpoint_assets';
import type { SoftwareOverviewResponse, SoftwareFact } from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const registerSoftwareOverviewRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SOFTWARE_OVERVIEW,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object({
              search: schema.maybe(schema.string()),
              // Filter to show only software seen within the last X hours (default: show all)
              // Use this to get "current state" - e.g., max_stale_hours=48 shows only software
              // seen in the last 48 hours
              max_stale_hours: schema.maybe(schema.number({ min: 1, max: 8760 })),
            }),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const { search, max_stale_hours: maxStaleHours } = request.query;

          logger.info(`[SoftwareOverview] Querying transformed index: ${SOFTWARE_INVENTORY_INDEX_PATTERN}`);

          // Build query - the transform has already normalized software.name
          const mustClauses: Array<Record<string, unknown>> = [];

          if (search) {
            mustClauses.push({
              wildcard: {
                'software.name': {
                  value: `*${search}*`,
                  case_insensitive: true,
                },
              },
            });
          }

          // Filter by freshness - only show software seen within max_stale_hours
          if (maxStaleHours) {
            mustClauses.push({
              range: {
                last_seen: {
                  gte: `now-${maxStaleHours}h`,
                },
              },
            });
          }

          // Query the transformed software inventory index
          // Aggregate by software.name to get unique software across all hosts
          const searchResult = await esClient.search({
            index: SOFTWARE_INVENTORY_INDEX_PATTERN,
            size: 0,
            query: mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} },
            aggs: {
              software_names: {
                terms: {
                  field: 'software.name',
                  size: 10000,
                },
                aggs: {
                  hosts: {
                    cardinality: {
                      field: 'host.name',
                    },
                  },
                  versions: {
                    terms: {
                      field: 'software.version',
                      size: 10,
                    },
                  },
                  software_type: {
                    terms: {
                      field: 'software.type',
                      size: 1,
                    },
                  },
                },
              },
            },
          });

          // Type for aggregation result
          interface SoftwareBucket {
            key: string;
            doc_count: number;
            hosts?: { value: number };
            versions?: { buckets: Array<{ key: string }> };
            software_type?: { buckets: Array<{ key: string }> };
          }

          const aggs = searchResult.aggregations as
            | { software_names?: { buckets: SoftwareBucket[] } }
            | undefined;
          const buckets = aggs?.software_names?.buckets ?? [];

          logger.info(`[SoftwareOverview] Found ${buckets.length} unique software items`);

          let applications = 0;
          let services = 0;
          let packages = 0;

          const items = buckets.map((bucket) => {
            const type = (bucket.software_type?.buckets?.[0]?.key ?? 'application') as
              | 'application'
              | 'package'
              | 'service';

            if (type === 'service') services++;
            else if (type === 'package') packages++;
            else applications++;

            return {
              name: bucket.key,
              type,
              hostCount: bucket.hosts?.value ?? 1,
              versions: bucket.versions?.buckets?.map((v) => v.key) ?? [],
            };
          });

          const overviewResponse: SoftwareOverviewResponse = {
            items,
            total: items.length,
            applications,
            services,
            packages,
          };

          return response.ok({
            body: overviewResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`[SoftwareOverview] Error: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
