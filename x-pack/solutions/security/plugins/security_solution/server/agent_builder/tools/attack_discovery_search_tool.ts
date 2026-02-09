/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const attackDiscoverySearchSchema = z.object({
  alertIds: z
    .array(z.string())
    .describe(
      'An array of alert IDs to search for in attack discoveries. The tool will find attack discoveries where kibana.alert.attack_discovery.alert_ids contains any of the provided alert IDs.'
    ),
});

export const SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID = securityTool('attack_discovery_search');

export const attackDiscoverySearchTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof attackDiscoverySearchSchema> => {
  return {
    id: SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze attack discoveries. Use this tool to find attack discoveries related to specific alerts by providing alert IDs. The tool searches the kibana.alert.attack_discovery.alert_ids field. Automatically queries both scheduled and ad-hoc attack discovery indices for the current space. Limits results to 5 attack discoveries.`,
    schema: attackDiscoverySearchSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;
            const index = `.alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`;

            const indexExists = await esClient.indices.exists({
              index,
            });
            if (indexExists) {
              return { status: 'available' };
            }

            return {
              status: 'unavailable',
              reason: 'Attack discovery index does not exist for this space',
            };
          }
          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check attack discovery index availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async ({ alertIds }, { spaceId, esClient }) => {
      logger.debug(
        `${SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID} tool called with alertIds: ${JSON.stringify(
          alertIds
        )}`
      );

      try {
        // Build date filter for last 7 days
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dateFilter = `@timestamp >= "${sevenDaysAgo.toISOString()}" AND @timestamp <= "${now.toISOString()}"`;

        // Build alert IDs filter using MV_CONTAINS with OR conditions
        const alertIdsFilter = alertIds
          .map((alertId) => `MV_CONTAINS(kibana.alert.attack_discovery.alert_ids,"${alertId}")`)
          .join(' OR ');

        const whereClause = `${dateFilter} AND (${alertIdsFilter})`;

        const esqlQuery = `FROM .alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}* METADATA _id
        | WHERE ${whereClause}
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
            type: ToolResultType.query,
            data: {
              esql: esqlQuery,
            },
          },
          {
            type: ToolResultType.esqlResults,
            data: {
              query: esqlQuery,
              columns: esqlResponse.columns,
              values: esqlResponse.values,
            },
          },
        ];

        return { results };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
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
