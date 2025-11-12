/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from './helpers';

const alertsSchema = z.object({
  query: z
    .string()
    .describe('A natural language query expressing the search request for security alerts'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Specific alerts index to search against. If not provided, will search against .alerts-security.alerts-* pattern.'
    ),
});

export const SECURITY_ALERTS_TOOL_ID = `${internalNamespaces}.alerts`;
export const alertsTool = (): BuiltinToolDefinition<typeof alertsSchema> => {
  return {
    id: SECURITY_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `A tool for searching and analyzing security alerts within your Elasticsearch cluster.
It supports both full-text relevance searches and structured analytical queries against security alerts.

Use this tool for any query that involves finding, counting, aggregating, or summarizing security alerts.

Examples of queries:
- "find alerts related to malware"
- "show me high severity alerts from the last 24 hours"
- "what are the top 10 alert types?"
- "search for alerts mentioning 'ransomware' or 'phishing'"
- "show me alerts from IP address 192.168.1.1"
- "list all alerts where the rule name contains 'suspicious'"

Note:
- The 'index' parameter can be used to specify a specific alerts index to search against.
- If not provided, the tool will automatically determine the index based on the current space.
- This tool is specifically designed for security alerts and understands security-specific fields and terminology.
    `,
    schema: alertsSchema,
    handler: async (
      { query: nlQuery, index },
      { request, esClient, modelProvider, logger, events }
    ) => {
      // Determine the index to use: either explicitly provided or based on the current space
      const searchIndex = index ?? `${DEFAULT_ALERTS_INDEX}-${getSpaceIdFromRequest(request)}`;

      logger.debug(`alerts tool called with query: ${nlQuery}, index: ${searchIndex}`);
      const results = await runSearchTool({
        nlQuery,
        index: searchIndex,
        esClient: esClient.asCurrentUser,
        model: await modelProvider.getDefaultModel(),
        events,
        logger,
      });
      return { results };
    },
    tags: ['security', 'alerts'],
  };
};
