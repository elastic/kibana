/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { CoreSetup } from '@kbn/core/server';
import type { ToolHandlerContext, SkillDefinition } from '@kbn/onechat-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

const getAlertsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Natural language query describing what security alerts to find (e.g., "malware detection alerts", "suspicious network activity", "failed authentication attempts"). If not provided, returns all alerts matching the other filters.'
    ),
  timeRange: z
    .object({
      from: z.string().describe('Start time in datemath format (e.g., "now-24h") or ISO timestamp'),
      to: z.string().describe('End time in datemath format (e.g., "now") or ISO timestamp'),
    })
    .optional()
    .describe('Time range for alerts'),
  severity: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .describe('Filter by alert severity level'),
  workflowStatus: z
    .enum(['open', 'acknowledged', 'closed'])
    .optional()
    .describe(
      'Filter by workflow status: "open" for new alerts, "acknowledged" for reviewed alerts, "closed" for resolved alerts'
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
  coreSetup: CoreSetup<any, any>;
}): SkillDefinition {
  return {
    id: 'security.get_alerts',
    name: 'Get Security Alerts',
    description:
      'Search and retrieve Security detection alerts. Uses natural language queries to find relevant security alerts based on rule names, descriptions, severity, and associated threat indicators. Supports filtering by severity, workflow status, and time range.',
    category: 'security',
    inputSchema: getAlertsSchema,
    handler: async (params, context) => {
      const { query, timeRange, severity, workflowStatus, limit = 10 } = params;
      
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
                  'event.category',
                  'event.action',
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

          // Add severity filter if provided
          if (severity) {
            mustClauses.push({
              term: {
                'kibana.alert.severity': severity,
              },
            });
          }

          // Add workflow status filter if provided
          if (workflowStatus) {
            mustClauses.push({
              term: {
                'kibana.alert.workflow_status': workflowStatus,
              },
            });
          }

          // Execute search
          const searchResponse = await esClient.asCurrentUser.search({
            index: '.alerts-security.alerts-*',
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
          logger.error(`Error searching security alerts: ${error}`);
          throw new Error(
            `Failed to search security alerts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else {
        // Fallback: use coreSetup if only request is available (shouldn't happen in Solution 2)
        const { request } = context as { request: import('@kbn/core-http-server').KibanaRequest };
        const [coreStart, plugins] = await coreSetup.getStartServices();
        const { elasticsearch } = coreStart;
        const { inference } = plugins;

        const esClient = elasticsearch.client.asScoped(request);
        const logger = coreSetup.logger.get('get_alerts_skill');

        // Get model from inference plugin
        const defaultConnector = await inference.getDefaultConnector(request);
        const chatModel = await inference.getChatModel({
          request,
          connectorId: defaultConnector.connectorId,
          chatModelOptions: {
            telemetryMetadata: { pluginId: 'security_solution', feature: 'get_alerts_skill' },
          },
        });

        // Build enhanced query with security alert-specific context
        let enhancedQuery = query;

        // Add time range filter if provided
        if (timeRange) {
          enhancedQuery = `${enhancedQuery} AND @timestamp >= ${timeRange.from} AND @timestamp <= ${timeRange.to}`;
        }

        // Add severity filter if provided
        if (severity) {
          enhancedQuery = `${enhancedQuery} AND kibana.alert.severity:${severity}`;
        }

        // Add workflow status filter if provided
        if (workflowStatus) {
          enhancedQuery = `${enhancedQuery} AND kibana.alert.workflow_status:${workflowStatus}`;
        }

        // Add context about security alerts
        enhancedQuery = `${enhancedQuery} in security detection alerts from rules`;

        try {
          // Use the builtin search tool to query alerts
          const results = await runSearchTool({
            nlQuery: enhancedQuery,
            index: '.alerts-security.alerts-*',
            esClient: esClient.asCurrentUser,
            model: chatModel,
            events: {
              emit: () => {}, // Placeholder event emitter
              reportProgress: () => {},
            },
            logger,
          });

          // Limit results if needed
          if (limit && results.length > limit) {
            return results.slice(0, limit);
          }

          return results;
        } catch (error) {
          logger.error(`Error searching security alerts: ${error}`);
          throw new Error(
            `Failed to search security alerts: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    },
    examples: [
      'Find critical security alerts from the last 24 hours',
      'Show me all open malware detection alerts',
      'Get high severity alerts about suspicious network activity',
      'Find acknowledged alerts related to authentication failures',
    ],
  };
}

