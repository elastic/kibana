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
import type {
  SoftwareInventoryResponse,
  SoftwareItem,
  SoftwareFact,
} from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const registerSoftwareInventoryRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.SOFTWARE_INVENTORY,
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
            params: schema.object({
              host_id: schema.string(),
            }),
            query: schema.object({
              search: schema.maybe(schema.string()),
              type: schema.maybe(
                schema.oneOf([
                  schema.literal('application'),
                  schema.literal('package'),
                  schema.literal('service'),
                  schema.literal('all'),
                ])
              ),
              page: schema.maybe(schema.number({ min: 0, defaultValue: 0 })),
              per_page: schema.maybe(schema.number({ min: 1, max: 100, defaultValue: 25 })),
              sort_field: schema.maybe(
                schema.oneOf([
                  schema.literal('name'),
                  schema.literal('version'),
                  schema.literal('lastSeen'),
                ])
              ),
              sort_direction: schema.maybe(
                schema.oneOf([schema.literal('asc'), schema.literal('desc')])
              ),
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
          const { host_id: hostId } = request.params;
          const {
            search,
            type: typeFilter = 'all',
            page = 0,
            per_page: perPage = 25,
            sort_field: sortField = 'name',
            sort_direction: sortDirection = 'asc',
            max_stale_hours: maxStaleHours,
          } = request.query;

          logger.info(
            `[SoftwareInventory] Querying transformed index for host: ${hostId}`
          );

          // Build query to get software for this host from the transformed index
          const mustClauses: Array<Record<string, unknown>> = [
            {
              bool: {
                should: [
                  { term: { 'host.id': hostId } },
                  { term: { 'host.name': hostId } },
                ],
                minimum_should_match: 1,
              },
            },
          ];

          // Filter by software type
          if (typeFilter && typeFilter !== 'all') {
            mustClauses.push({
              term: { 'software.type': typeFilter },
            });
          }

          // Filter by search term
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

          // Map sort field to the transformed index field
          const sortFieldMap: Record<string, string> = {
            name: 'software.name',
            version: 'software.version',
            lastSeen: 'last_seen',
          };

          const esSortField = sortFieldMap[sortField] || 'software.name';

          // Query the transformed software inventory index
          const searchResult = await esClient.search<SoftwareFact>({
            index: SOFTWARE_INVENTORY_INDEX_PATTERN,
            from: page * perPage,
            size: perPage,
            query: {
              bool: {
                must: mustClauses,
              },
            },
            sort: [{ [esSortField]: sortDirection }],
          });

          const total =
            typeof searchResult.hits.total === 'number'
              ? searchResult.hits.total
              : searchResult.hits.total?.value ?? 0;

          logger.info(
            `[SoftwareInventory] Found ${searchResult.hits.hits.length} software items for host: ${hostId}`
          );

          // Map transformed documents to SoftwareItem format
          const items: SoftwareItem[] = searchResult.hits.hits.map((hit) => {
            const source = hit._source as SoftwareFact;
            return {
              name: source.software.name,
              version: source.software.version ?? 'Unknown',
              type: source.software.type,
              path: source.software.path,
              publisher: source.software.publisher,
              status: source.software.status,
              startType: source.software.start_type,
              userAccount: source.software.user_account,
              arch: source.software.arch,
              bundleId: source.software.bundle_id,
              lastSeen: source.last_seen,
              firstSeen: source.first_seen,
            };
          });

          const inventoryResponse: SoftwareInventoryResponse = {
            items,
            total,
            page,
            perPage,
          };

          return response.ok({
            body: inventoryResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`[SoftwareInventory] Error: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
