/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, IKibanaResponse } from '@kbn/core/server';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { z } from '@kbn/zod';
import { transformError } from '@kbn/securitysolution-es-utils';

import { performChecks } from '../../../helpers';
import { buildResponse } from '../../../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../../../types';
import { THREAT_HUNTING_PRIORITIES } from '../../constants';

// Request query schema
const GetThreatHuntingPrioritiesRequestQuery = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
  sort_field: z.string().optional().default('@timestamp'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  executionUuid: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

type GetThreatHuntingPrioritiesRequestQuery = z.infer<
  typeof GetThreatHuntingPrioritiesRequestQuery
>;

// Response schema
const GetThreatHuntingPrioritiesResponse = z.object({
  data: z.array(
    z.object({
      _id: z.string(),
      _source: z.record(z.unknown()),
    })
  ),
  total: z.number(),
  skip: z.number(),
  limit: z.number(),
});

type GetThreatHuntingPrioritiesResponse = z.infer<typeof GetThreatHuntingPrioritiesResponse>;

export const getThreatHuntingPrioritiesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .get({
      access: 'public',
      path: THREAT_HUNTING_PRIORITIES,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetThreatHuntingPrioritiesRequestQuery),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(GetThreatHuntingPrioritiesResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<GetThreatHuntingPrioritiesResponse>> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          const { query } = request;
          const {
            skip,
            limit,
            sort_field: sortField,
            sort_order: sortOrder,
            executionUuid,
            start,
            end,
          } = query;

          // Get Elasticsearch client
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const indexName = '.entity_analytics.priorities';

          // Build query
          const mustClauses: Array<Record<string, unknown>> = [];

          if (executionUuid) {
            mustClauses.push({
              term: {
                execution_uuid: executionUuid,
              },
            });
          }

          if (start || end) {
            const rangeClause: Record<string, unknown> = {};
            if (start) {
              rangeClause.gte = start;
            }
            if (end) {
              rangeClause.lte = end;
            }
            mustClauses.push({
              range: {
                '@timestamp': rangeClause,
              },
            });
          }

          const searchQuery = {
            index: indexName,
            body: {
              query: {
                bool: {
                  must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
                },
              },
              sort: [
                {
                  [sortField]: {
                    order: sortOrder,
                  },
                },
              ],
              from: skip,
              size: limit,
            },
            ignore_unavailable: true,
          };

          const searchResponse = await esClient.search(searchQuery);

          const hits = searchResponse.hits.hits || [];
          const total =
            typeof searchResponse.hits.total === 'number'
              ? searchResponse.hits.total
              : searchResponse.hits.total?.value || 0;

          return response.ok({
            body: {
              data: hits.map((hit) => ({
                _id: hit._id,
                _source: hit._source as Record<string, unknown>,
              })),
              total,
              skip,
              limit,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
