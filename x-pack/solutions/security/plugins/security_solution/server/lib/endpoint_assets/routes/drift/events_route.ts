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
import { ENDPOINT_ASSETS_ROUTES } from '../../../../../common/endpoint_assets';
import type { DriftEventsResponse, DriftEvent } from '../../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../../types';

const TIME_RANGE_TO_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const registerDriftEventsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.DRIFT_EVENTS,
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
              time_range: schema.oneOf(
                [
                  schema.literal('1h'),
                  schema.literal('24h'),
                  schema.literal('7d'),
                  schema.literal('30d'),
                ],
                { defaultValue: '24h' }
              ),
              categories: schema.maybe(
                schema.arrayOf(
                  schema.oneOf([
                    schema.literal('privileges'),
                    schema.literal('persistence'),
                    schema.literal('network'),
                    schema.literal('software'),
                    schema.literal('posture'),
                  ])
                )
              ),
              severities: schema.maybe(
                schema.arrayOf(
                  schema.oneOf([
                    schema.literal('low'),
                    schema.literal('medium'),
                    schema.literal('high'),
                    schema.literal('critical'),
                  ])
                )
              ),
              page: schema.number({ defaultValue: 1, min: 1 }),
              page_size: schema.number({ defaultValue: 25, min: 1, max: 100 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const { time_range: timeRange, categories, severities, page, page_size: pageSize } =
            request.query;

          const timeRangeMs = TIME_RANGE_TO_MS[timeRange] || TIME_RANGE_TO_MS['24h'];
          const rangeStart = Date.now() - timeRangeMs;

          const mustClauses = [
            {
              range: {
                '@timestamp': {
                  gte: rangeStart,
                  lte: Date.now(),
                },
              },
            },
          ];

          if (categories && categories.length > 0) {
            mustClauses.push({
              terms: {
                'drift.category': categories,
              },
            } as never);
          }

          if (severities && severities.length > 0) {
            mustClauses.push({
              terms: {
                'drift.severity': severities,
              },
            } as never);
          }

          const from = (page - 1) * pageSize;

          const result = await esClient.search({
            index: 'endpoint-drift-events-*',
            size: pageSize,
            from,
            query: {
              bool: {
                must: mustClauses,
              },
            },
            sort: [{ '@timestamp': 'desc' }],
          });

          const events = result.hits.hits.map((hit) => hit._source as DriftEvent);
          const total =
            typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total;

          const eventsResponse: DriftEventsResponse = {
            events,
            total,
            page,
            page_size: pageSize,
          };

          return response.ok({
            body: eventsResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting drift events: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
