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
import { generateEsql } from '@kbn/onechat-genai-utils/tools/generate_esql/nl_to_esql';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
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
// candidate for bound tool
export const attackDiscoverySearchTool = (): BuiltinToolDefinition<
  typeof attackDiscoverySearchSchema
> => {
  return {
    id: SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze attack discoveries. Use this tool to find attack discoveries related to specific alerts by providing alert IDs. The tool searches the kibana.alert.attack_discovery.alert_ids field. Automatically queries both scheduled and ad-hoc attack discovery indices for the current space. Limits results to 5 attack discoveries.`,
    schema: attackDiscoverySearchSchema,
    handler: async ({ alertIds }, { request, esClient, logger, modelProvider, events }) => {
      const spaceId = getSpaceIdFromRequest(request);

      logger.debug(
        `attack-discovery-search tool called with alertIds: ${JSON.stringify(alertIds)}`
      );

      try {
        const indexPattern = `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId},.adhoc${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`;

        // Build natural language query for generateEsql
        const alertIdsList = alertIds && alertIds.length > 0 ? alertIds.join(', ') : '';
        const nlQuery = alertIdsList
          ? `Find attack discoveries from the last 7 days where the kibana.alert.attack_discovery.alert_ids array field contains any of these alert IDs: ${alertIdsList}. Return the fields: _id, kibana.alert.attack_discovery.title, kibana.alert.attack_discovery.summary_markdown, kibana.alert.workflow_status, kibana.alert.attack_discovery.alert_ids, kibana.alert.case_ids, @timestamp. Sort by @timestamp descending and limit to 5 results.`
          : `Find attack discoveries from the last 7 days. Return the fields: _id, kibana.alert.attack_discovery.title, kibana.alert.attack_discovery.summary_markdown, kibana.alert.workflow_status, kibana.alert.attack_discovery.alert_ids, kibana.alert.case_ids, @timestamp. Sort by @timestamp descending and limit to 5 results.`;

        logger.debug(`Generating ES|QL query from natural language: ${nlQuery}`);

        // Generate ES|QL query using generateEsql
        const model = await modelProvider.getDefaultModel();
        const generateEsqlResponse = await generateEsql({
          nlQuery,
          index: indexPattern,
          executeQuery: false,
          model,
          esClient: esClient.asCurrentUser,
          logger,
          events,
        });
        console.log('generateEsqlResponse==>', JSON.stringify(generateEsqlResponse, null, 2));

        if (generateEsqlResponse.error) {
          throw new Error(`Failed to generate ES|QL query: ${generateEsqlResponse.error}`);
        }

        if (!generateEsqlResponse.query) {
          throw new Error('No ES|QL query was generated');
        }

        const esqlQuery = generateEsqlResponse.query;
        logger.debug(`Generated ES|QL query: ${esqlQuery}`);

        // Execute the generated query
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
