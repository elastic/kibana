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
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from '../constants';

const alertsSchema = z.object({
  query: z
    .string()
    .describe('A natural language query expressing the search request for security alerts'),
  index: z
    .string()
    .optional()
    .describe(
      'Specific alerts index to search against. If not provided, will search against .alerts-security.alerts-* pattern.'
    ),
});

export const SECURITY_ALERTS_TOOL_ID = securityTool('alerts');
export const alertsTool = (): BuiltinToolDefinition<typeof alertsSchema> => {
  return {
    id: SECURITY_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze security alerts using full-text or structured queries for finding, counting, aggregating, or summarizing alerts.`,
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
