/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools/search/run_search_tool';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { securityTool } from '../constants';

const securityLabsSearchSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language query expressing the search request for Security Labs articles. Use this to find Security Labs content about specific malware, attack techniques, MITRE ATT&CK techniques, or rule names.'
    ),
});

export const SECURITY_LABS_SEARCH_TOOL_ID = securityTool('security-labs-search');

const SECURITY_LABS_INDEX_PATTERN = '.kibana-elastic-ai-assistant-knowledge-base-default';

export const securityLabsSearchTool = (): BuiltinToolDefinition<
  typeof securityLabsSearchSchema
> => {
  return {
    id: SECURITY_LABS_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze Security Labs knowledge base content. Use this tool to find Security Labs articles about specific malware, attack techniques, MITRE ATT&CK techniques, or rule names. Automatically filters to Security Labs content only and limits results to 10 articles.`,
    schema: securityLabsSearchSchema,
    handler: async ({ query: nlQuery }, { esClient, modelProvider, logger, events }) => {
      logger.debug(`security-labs-search tool called with query: ${nlQuery}`);

      try {
        // Enhance query to filter by Security Labs resource and limit results
        const enhancedQuery = `${nlQuery} Filter to only Security Labs content (kb_resource: ${SECURITY_LABS_RESOURCE}). Limit to 3 results.`;

        const results = await runSearchTool({
          nlQuery: enhancedQuery,
          index: SECURITY_LABS_INDEX_PATTERN,
          model: await modelProvider.getDefaultModel(),
          esClient: esClient.asCurrentUser,
          logger,
          events,
        });
        console.log('SL ==>', results);

        return { results };
      } catch (error) {
        logger.error(`Error in security-labs-search tool: ${error.message}`);
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
    tags: ['security', 'security-labs', 'knowledge-base', 'search'],
  };
};
