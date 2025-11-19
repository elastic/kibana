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
import { getRiskIndex } from '../../../../common/search_strategy/security_solution/risk_score/common';
import { getSpaceIdFromRequest } from '../helpers';
import { securityTool } from '../constants';

const riskScoreSearchSchema = z.object({
  query: z
    .string()
    .describe(
      'A natural language query expressing the search request for risk scores. Use this to find risk scores for hosts (host.name) or users (user.name). Include fields like host.risk.calculated_score_norm, host.risk.calculated_level, user.risk.calculated_score_norm, user.risk.calculated_level.'
    ),
});

export const SECURITY_RISK_SCORE_SEARCH_TOOL_ID = securityTool('risk-score-search');

export const riskScoreSearchTool = (): BuiltinToolDefinition<typeof riskScoreSearchSchema> => {
  return {
    id: SECURITY_RISK_SCORE_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze risk scores for hosts and users. Use this tool to find risk score information including calculated_score_norm and calculated_level for entities. Automatically queries the latest risk score index for the current space.`,
    schema: riskScoreSearchSchema,
    handler: async ({ query: nlQuery }, { request, esClient, modelProvider, logger, events }) => {
      const spaceId = getSpaceIdFromRequest(request);
      const riskIndex = getRiskIndex(spaceId, true);

      logger.debug(`risk-score-search tool called with query: ${nlQuery}, index: ${riskIndex}`);

      try {
        const results = await runSearchTool({
          nlQuery,
          index: riskIndex,
          model: await modelProvider.getDefaultModel(),
          esClient: esClient.asCurrentUser,
          logger,
          events,
        });

        console.log('RISK ==>', results);

        return { results };
      } catch (error) {
        logger.error(`Error in risk-score-search tool: ${error.message}`);
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
    tags: ['security', 'risk-score', 'search'],
  };
};
