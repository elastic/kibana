/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { CoreSetup } from '@kbn/core/server';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  ObservabilityAgentPluginStartDependencies,
  ObservabilityAgentPluginStart,
} from '../types';

// Re-export SkillDefinition from the onechat-server package
export type { SkillDefinition } from '@kbn/onechat-server';

const getAlertsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Natural language query describing what alerts to find (e.g., "high CPU alerts", "failed login attempts"). If not provided, returns all alerts matching the other filters.'
    ),
  timeRange: z
    .object({
      from: z.string().describe('Start time in datemath format (e.g., "now-24h") or ISO timestamp'),
      to: z.string().describe('End time in datemath format (e.g., "now") or ISO timestamp'),
    })
    .optional()
    .describe('Time range for alerts'),
  status: z
    .enum(['active', 'recovered'])
    .optional()
    .describe(
      'Filter by alert status: "active" for currently active alerts, "recovered" for resolved alerts'
    ),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe('Maximum number of alerts to return (default: 10)'),
});

export function createGetAlertsSkill({
  coreSetup,
}: {
  coreSetup: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
}): SkillDefinition {
  return {
    id: 'observability.get_alerts',
    name: 'Get Alerts',
    description:
      'Search and retrieve Observability alerts from APM, Infrastructure, Logs, Uptime, and SLO. Uses natural language queries to find relevant alerts based on their content, rule names, reasons, and associated entities (hosts, services, etc.).',
    category: 'observability',
    inputSchema: getAlertsSchema,
    handler: async (params, context) => {
      const { query, timeRange, status, limit = 10 } = params;
      
      // Check if we have full ToolHandlerContext (from middleware) or just request
      if ('esClient' in context && 'logger' in context) {
        // Use full context from middleware
        const { esClient, logger } = context as ToolHandlerContext;

        try {
          // Build Elasticsearch query
          const mustClauses: QueryDslQueryContainer[] = [];

          // Add text query if provided
          if (query && query.trim()) {
            mustClauses.push({
              multi_match: {
                query: query.trim(),
                fields: [
                  'kibana.alert.rule.name^3',
                  'kibana.alert.rule.description^2',
                  'kibana.alert.reason',
                  'message',
                  'host.name',
                  'service.name',
                  'container.name',
                ],
                type: 'best_fields',
                operator: 'or',
              },
            });
          }

          // Add time range filter if provided
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

          // Add status filter if provided
          if (status) {
            const statusValue = status === 'active' ? 'active' : 'recovered';
            mustClauses.push({
              term: {
                'kibana.alert.status': statusValue,
              },
            });
          }

          // Execute search
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

          // Format results
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
            `Failed to search observability alerts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        // Fallback: use coreSetup if only request is available (shouldn't happen in Solution 2)
        const { request } = context as { request: import('@kbn/core-http-server').KibanaRequest };
        const [coreStart] = await coreSetup.getStartServices();
        const { elasticsearch } = coreStart;

        const esClient = elasticsearch.client.asScoped(request);
        const logger = coreSetup.logger.get('get_alerts_skill');

        try {
          // Build Elasticsearch query
          const mustClauses: QueryDslQueryContainer[] = [];

          // Add text query if provided
          if (query && query.trim()) {
            mustClauses.push({
              multi_match: {
                query: query.trim(),
                fields: [
                  'kibana.alert.rule.name^3',
                  'kibana.alert.rule.description^2',
                  'kibana.alert.reason',
                  'message',
                  'host.name',
                  'service.name',
                  'container.name',
                ],
                type: 'best_fields',
                operator: 'or',
              },
            });
          }

          // Add time range filter if provided
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

          // Add status filter if provided
          if (status) {
            const statusValue = status === 'active' ? 'active' : 'recovered';
            mustClauses.push({
              term: {
                'kibana.alert.status': statusValue,
              },
            });
          }

          // Execute search
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

          // Format results
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
            `Failed to search observability alerts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    },
    examples: [
      'Find active high CPU alerts from the last hour',
      'Show me all infrastructure alerts about disk space',
      'Get APM alerts for service errors in the past 24 hours',
      'Find SLO alerts that are currently active',
    ],
  };
}
