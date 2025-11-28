/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup } from '@kbn/core/server';
import type { ToolHandlerContext, SkillDefinition } from '@kbn/onechat-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

const getAlertsSchema = z.object({
  query: z.string().optional().describe('Natural language query to search for alerts'),
  timeRange: z
    .object({
      from: z.string().describe('Start time in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")'),
      to: z.string().describe('End time in ISO 8601 format (e.g., "2024-01-02T00:00:00Z")'),
    })
    .optional()
    .describe('Time range filter for alerts'),
  status: z
    .enum(['active', 'recovered'])
    .optional()
    .describe('Filter alerts by status: active or recovered'),
  limit: z.number().int().min(1).max(100).optional().default(10).describe('Maximum number of alerts to return'),
});

export function createGetAlertsSkill({ coreSetup }: { coreSetup: CoreSetup<any, any> }): SkillDefinition {
  return {
    id: 'observability.get_alerts',
    name: 'Get Observability Alerts',
    description:
      'Search and retrieve observability alerts from APM, Infrastructure, Logs, Uptime, and SLO. Supports filtering by time range, status, and natural language queries.',
    category: 'observability',
    inputSchema: getAlertsSchema,
    examples: [
      'Get active alerts from the last hour',
      'Find alerts related to high CPU usage',
      'Show recovered alerts from yesterday',
    ],
    handler: async (params, context) => {
      const { query, timeRange, status, limit = 10 } = params;
      let esClient: ToolHandlerContext['esClient'];
      let logger: ToolHandlerContext['logger'];
      let events: ToolHandlerContext['events'];

      if ('esClient' in context && 'logger' in context && 'events' in context) {
        ({ esClient, logger, events } = context as ToolHandlerContext);
      } else {
        // Fallback: use coreSetup if only request is available
        const { request } = context as { request: import('@kbn/core-http-server').KibanaRequest };
        const [coreStart] = await coreSetup.getStartServices();
        esClient = coreStart.elasticsearch.client.asScoped(request);
        logger = coreSetup.logger.get('get_alerts_skill');
        events = { emit: () => {}, reportProgress: () => {} }; // Noop events for fallback
      }

      const mustClauses: QueryDslQueryContainer[] = [];

      if (query && query.trim()) {
        mustClauses.push({
          multi_match: {
            query: query,
            fields: [
              'kibana.alert.rule.name^3',
              'kibana.alert.rule.description^2',
              'kibana.alert.reason',
              'message',
              'host.name',
              'service.name',
              'container.name',
            ],
            fuzziness: 'AUTO',
          },
        });
      }

      if (timeRange) {
        mustClauses.push({
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lte: timeRange.to,
            },
          },
        });
      }

      if (status) {
        const statusValue = status === 'active' ? 'active' : 'recovered';
        mustClauses.push({
          term: {
            'kibana.alert.status': statusValue,
          },
        });
      }

      try {
        const searchResponse = await esClient.asCurrentUser.search({
          index: '.alerts-observability.*',
          body: {
            query: {
              bool: {
                must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
              },
            },
            size: limit,
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
          },
        });

        const results = searchResponse.hits.hits.map((hit) => ({
          _id: hit._id,
          _index: hit._index,
          _source: hit._source,
          _score: hit._score,
        }));

        return results;
      } catch (error) {
        logger.error(`Error searching observability alerts: ${error}`);
        throw new Error(
          `Failed to search observability alerts: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
}

