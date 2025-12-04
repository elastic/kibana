/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { ToolHandlerContext } from '@kbn/onechat-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SkillTool } from '@kbn/agent-skills-common';
import { getAlertsSchema } from './get_alerts_skill';

interface GetAlertsToolDeps {
  coreSetup: CoreSetup<any, any>;
  logger: Logger;
}

export function getSecurityAlertsSkillTool(deps: GetAlertsToolDeps): SkillTool<typeof getAlertsSchema> {
  return {
    id: 'security.get_alerts',
    name: 'Get Security Alerts',
    shortDescription: 'Search and retrieve security detection alerts',
    fullDescription:
      'Search and retrieve security detection alerts. Supports filtering by time range, severity, workflow status, and natural language queries.',
    categories: ['security'],
    inputSchema: getAlertsSchema,
    examples: [
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{}})',
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{"severity":"critical"}})',
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{"severity":"high","workflowStatus":"open"}})',
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{"query":"malware","limit":20}})',
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{"timeRange":{"from":"2024-01-01T00:00:00Z","to":"2024-01-02T00:00:00Z"}}})',
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{"severity":"high","workflowStatus":"acknowledged","limit":50}})',
      'tool("invoke_skill", {"skillId":"security.get_alerts","params":{"query":"ransomware","workflowStatus":"open"}})',
    ],
    handler: async (params, context) => {
      const { query, timeRange, severity, workflowStatus, limit = 10 } = params;
      let esClient: ToolHandlerContext['esClient'];
      let logger: ToolHandlerContext['logger'];
      let events: ToolHandlerContext['events'];

      if ('esClient' in context && 'logger' in context && 'events' in context) {
        ({ esClient, logger, events } = context as ToolHandlerContext);
      } else {
        // Fallback: use coreSetup if only request is available
        const { request } = context as { request: import('@kbn/core-http-server').KibanaRequest };
        const [coreStart] = await deps.coreSetup.getStartServices();
        esClient = coreStart.elasticsearch.client.asScoped(request);
        logger = deps.logger;
        events = { reportProgress: () => {} }; // Noop events for fallback
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
              'tags',
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

      if (severity) {
        mustClauses.push({
          term: {
            'kibana.alert.severity': severity,
          },
        });
      }

      if (workflowStatus) {
        mustClauses.push({
          term: {
            'kibana.alert.workflow_status': workflowStatus,
          },
        });
      }

      try {
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
          `Failed to search security alerts: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  };
}

