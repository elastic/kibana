/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/onechat-server';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools/search/run_search_tool';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from './constants';
import { otherResult } from '@kbn/onechat-genai-utils/tools/utils/results';

const securityLabsSearchSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language query expressing the search request for Security Labs articles. Use this to find Security Labs content about specific malware, attack techniques, MITRE ATT&CK techniques, or rule names.'
    ),
});

export const SECURITY_LABS_SEARCH_TOOL_ID = securityTool('security_labs_search');

const getKnowledgeBaseIndex = (spaceId: string): string =>
  `.kibana-elastic-ai-assistant-knowledge-base-${spaceId}`;

export const securityLabsSearchTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof securityLabsSearchSchema> => {
  return {
    id: SECURITY_LABS_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze Security Labs knowledge base content. Use this tool to find Security Labs articles about specific malware, attack techniques, MITRE ATT&CK techniques, or rule names. Automatically filters to Security Labs content only and limits results to 10 articles.`,
    schema: securityLabsSearchSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;
            const knowledgeBaseIndex = getKnowledgeBaseIndex(spaceId);

            const response = await esClient.search({
              index: knowledgeBaseIndex,
              size: 1,
              terminate_after: 1,
              query: {
                bool: {
                  filter: [
                    {
                      term: {
                        kb_resource: SECURITY_LABS_RESOURCE,
                      },
                    },
                  ],
                },
              },
            });

            if (response.hits.hits.length > 0) {
              return { status: 'available' };
            }

            return {
              status: 'unavailable',
              reason: 'Security Labs content not found in knowledge base',
            };
          }
          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check Security Labs knowledge base availability: ${error instanceof Error ? error.message : 'Unknown error'
              }`,
          };
        }
      },
    },
    handler: async ({ query: nlQuery }, { request, esClient, modelProvider, events }) => {
      logger.debug(`${SECURITY_LABS_SEARCH_TOOL_ID} tool called with query: ${nlQuery}`);

      try {
        const spaceId = getSpaceIdFromRequest(request);
        const knowledgeBaseIndex = getKnowledgeBaseIndex(spaceId);

        // Enhance query to filter by Security Labs resource and limit results
        const enhancedQuery = `${nlQuery} Filter to only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}). Limit to 3 results.`;

        const results = await runSearchTool({
          nlQuery: enhancedQuery,
          index: knowledgeBaseIndex,
          model: await modelProvider.getDefaultModel(),
          esClient: esClient.asCurrentUser,
          logger,
          events,
        });

        return {
          results: [
            otherResult({
              operation: 'search',
              index: knowledgeBaseIndex,
              resource: SECURITY_LABS_RESOURCE,
              raw: results,
            }),
          ],
        };
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
