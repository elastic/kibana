/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { executeEsql } from '@kbn/onechat-genai-utils';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from '../constants';

const attackDiscoverySearchSchema = z.object({
  alertIds: z
    .array(z.string())
    .describe(
      'An array of alert IDs to search for in attack discoveries. The tool will find attack discoveries where kibana.alert.attack_discovery.alert_ids contains any of the provided alert IDs.'
    ),
});

export const SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID = securityTool('attack_discovery_search');

export const attackDiscoverySearchTool = (): BuiltinToolDefinition<
  typeof attackDiscoverySearchSchema
> => {
  return {
    id: SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze attack discoveries. Use this tool to find attack discoveries related to specific alerts by providing alert IDs. The tool searches the kibana.alert.attack_discovery.alert_ids field. Automatically queries both scheduled and ad-hoc attack discovery indices for the current space. Limits results to 5 attack discoveries.`,
    schema: attackDiscoverySearchSchema,
    handler: async ({ alertIds }, { request, esClient, logger }) => {
      const spaceId = getSpaceIdFromRequest(request);

      logger.debug(
        `attack-discovery-search tool called with alertIds: ${JSON.stringify(alertIds)}`
      );

      try {
        // Build date filter for last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dateFilter = `@timestamp >= "${sevenDaysAgo.toISOString()}" AND @timestamp <= "${now.toISOString()}"`;

        // TODO use AD API so we can filter by kibana.alert.attack_discovery.alert_ids
        const esqlQuery = `FROM .alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}* METADATA _id
        | WHERE ${dateFilter}
        | KEEP _id, kibana.alert.attack_discovery.title, kibana.alert.severity, kibana.alert.workflow_status, kibana.alert.attack_discovery.alert_ids, kibana.alert.case_ids, @timestamp
        | SORT @timestamp DESC
        | LIMIT 100`;

        logger.debug(`Executing ES|QL query: ${esqlQuery}`);

        const esqlResponse = await executeEsql({
          query: esqlQuery,
          esClient: esClient.asCurrentUser,
        });

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
