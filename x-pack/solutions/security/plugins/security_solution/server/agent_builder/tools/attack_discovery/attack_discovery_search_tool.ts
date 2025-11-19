/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { executeEsql } from '@kbn/onechat-genai-utils/tools/utils/esql';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { getSpaceIdFromRequest } from '../helpers';
import { securityTool } from '../constants';

const attackDiscoverySearchSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language query expressing the search request for attack discoveries. Use this to find attack discoveries that include specific alert IDs in the kibana.alert.attack_discovery.alert_ids field. Include fields like kibana.alert.attack_discovery.title, kibana.alert.attack_discovery.summary_markdown, and kibana.alert.attack_discovery.alert_ids.'
    ),
});

export const SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID = securityTool('attack-discovery-search');

/**
 * Extracts alert IDs from a natural language query.
 * Looks for patterns like "alert ID 'xxx'", "alert ID xxx", or quoted UUIDs.
 */
const extractAlertIds = (query: string): string[] => {
  const alertIds: string[] = [];

  // Pattern 1: "alert ID 'xxx'" or "alert ID \"xxx\""
  const quotedPattern = /alert\s+id[:\s]+['"]([^'"]+)['"]/gi;
  let match;
  while ((match = quotedPattern.exec(query)) !== null) {
    alertIds.push(match[1]);
  }

  // Pattern 2: UUID pattern (8-4-4-4-12 hex digits)
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuidMatches = query.match(uuidPattern);
  if (uuidMatches) {
    alertIds.push(...uuidMatches);
  }

  return [...new Set(alertIds)]; // Remove duplicates
};

export const attackDiscoverySearchTool = (): BuiltinToolDefinition<
  typeof attackDiscoverySearchSchema
> => {
  return {
    id: SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze attack discoveries. Use this tool to find attack discoveries related to specific alerts by searching for alert IDs in the kibana.alert.attack_discovery.alert_ids field. Automatically queries both scheduled and ad-hoc attack discovery indices for the current space. Limits results to 5 attack discoveries.`,
    schema: attackDiscoverySearchSchema,
    handler: async ({ query: nlQuery }, { request, esClient, logger }) => {
      const spaceId = getSpaceIdFromRequest(request);

      logger.debug(`attack-discovery-search tool called with query: ${nlQuery}`);

      try {
        // Extract alert IDs from the natural language query
        const alertIds = extractAlertIds(nlQuery);

        // Build date filter for last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dateFilter = `@timestamp >= "${sevenDaysAgo.toISOString()}" AND @timestamp <= "${now.toISOString()}"`;

        // Build WHERE clause
        let whereClause = dateFilter;
        if (alertIds.length > 0) {
          // Search for alert IDs in the array field
          const alertIdConditions = alertIds
            .map((id) => `"${id}" IN kibana.alert.attack_discovery.alert_ids`)
            .join(' OR ');
          whereClause = `${dateFilter} AND (${alertIdConditions})`;
        }

        // Build ES|QL query
        const esqlQuery = [
          `FROM ${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}*,.adhoc.${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}* METADATA _id`,
          `| WHERE ${whereClause}`,
          `| KEEP _id, kibana.alert.attack_discovery.title, kibana.alert.attack_discovery.summary_markdown, kibana.alert.workflow_status, kibana.alert.attack_discovery.alert_ids, kibana.alert.case_ids, @timestamp`,
          `| SORT @timestamp DESC`,
          `| LIMIT 5`,
        ].join('\n');

        logger.debug(`Executing ES|QL query: ${esqlQuery}`);

        const esqlResponse = await executeEsql({
          query: esqlQuery,
          esClient: esClient.asCurrentUser,
        });
        console.log('ATT ==>', esqlResponse);

        const results = [
          {
            type: 'query' as const,
            data: {
              esql: esqlQuery,
            },
          },
          {
            type: 'tabularData' as const,
            data: {
              source: 'esql',
              query: esqlQuery,
              columns: esqlResponse.columns,
              values: esqlResponse.values,
            },
          },
        ];

        return { results };
      } catch (error) {
        logger.error(`Error in attack-discovery-search tool: ${error.message}`);
        return {
          results: [
            {
              type: 'error',
              data: {
                message: `Error: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'attack-discovery', 'search'],
  };
};
