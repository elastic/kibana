/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/onechat-server';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools/search/run_search_tool';
import { getSecurityLabsIndexName } from '@kbn/product-doc-common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { securityTool } from './constants';

const securityLabsSearchSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language query expressing the search request for Security Labs articles. Use this to find Security Labs content about specific malware, attack techniques, MITRE ATT&CK techniques, or rule names.'
    ),
});

export const SECURITY_LABS_SEARCH_TOOL_ID = securityTool('security_labs_search');

// Security Labs artifacts are installed to a global, hidden index.
// When called without an `inferenceId`, this resolves to the default (ELSER) index name.
const SECURITY_LABS_INDEX = getSecurityLabsIndexName();

export const securityLabsSearchTool = (
  core: SecuritySolutionPluginCoreSetupDependencies
): BuiltinToolDefinition<typeof securityLabsSearchSchema> => {
  return {
    id: SECURITY_LABS_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze Security Labs content installed via the AI knowledge base artifacts. Use this tool to find Security Labs articles about specific malware, attack techniques, MITRE ATT&CK techniques, or rule names. Limits results to 10 articles.`,
    schema: securityLabsSearchSchema,
    availability: {
      // Security Labs artifacts are installed in a global (non-space) index.
      cacheMode: 'global',
      handler: async (_ctx: ToolAvailabilityContext) => {
        try {
          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;

          const response = await esClient.search({
            index: SECURITY_LABS_INDEX,
            size: 1,
            terminate_after: 1,
            query: { match_all: {} },
          });

          if (response.hits.hits.length > 0) {
            return { status: 'available' };
          }

          return {
            status: 'unavailable',
            reason: 'Security Labs content not installed',
          };
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check Security Labs content availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async ({ query: nlQuery }, { request, esClient, modelProvider, logger, events }) => {
      logger.debug(`${SECURITY_LABS_SEARCH_TOOL_ID} tool called with query: ${nlQuery}`);

      try {
        // Enhance query and limit results
        const enhancedQuery = `${nlQuery} Limit to 3 results.`;

        const results = await runSearchTool({
          nlQuery: enhancedQuery,
          index: SECURITY_LABS_INDEX,
          model: await modelProvider.getDefaultModel(),
          // Security Labs is stored in a restricted, hidden index.
          // Use an internal client for the search.
          esClient: esClient.asInternalUser,
          logger,
          events,
        });

        return { results };
      } catch (error) {
        logger.error(`Error in ${SECURITY_LABS_SEARCH_TOOL_ID} tool: ${error.message}`);
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
    tags: ['security', 'security-labs', 'knowledge-base', 'search'],
  };
};
