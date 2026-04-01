/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';

import { buildDefaultEsqlQuery } from '@kbn/discoveries/impl/lib/build_default_esql_query';

export const GET_DEFAULT_ESQL_QUERY_TOOL_ID = 'security.attack-discovery.get_default_esql_query';

export const getDefaultEsqlQueryTool = (): BuiltinSkillBoundedTool => ({
  description:
    'Returns the default ES|QL query for retrieving security alerts, using the space-specific anonymization settings to determine the KEEP fields.',
  handler: async (_args, context) => {
    try {
      const query = await buildDefaultEsqlQuery({
        esClient: context.esClient.asCurrentUser,
        logger: context.logger,
        spaceId: context.spaceId,
      });

      return {
        results: [
          {
            data: { query },
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            data: {
              message: `Failed to build default ES|QL query: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
          },
        ],
      };
    }
  },
  id: GET_DEFAULT_ESQL_QUERY_TOOL_ID,
  schema: z.object({}),
  type: ToolType.builtin,
});
