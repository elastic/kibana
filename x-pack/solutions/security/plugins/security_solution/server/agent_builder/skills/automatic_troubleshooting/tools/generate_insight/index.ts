/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';

import { GENERATE_INSIGHT_TOOL_ID } from '../..';
import { createGenerateInsightGraph } from './graph';

const generateInsightSchema = z.object({
  problemDescription: z
    .string()
    .min(1)
    .describe('A brief description of the original problem being diagnosed.'),
  remediation: z.string().min(1).describe('A detailed guide for how to remediate the problem.'),
  endpointIds: z.array(z.string()).min(1).describe('Related endpoint IDs'),
  data: z
    .array(z.object({}).catchall(z.unknown()))
    .min(1)
    .describe('Relevant raw unedited documents.'),
});

export const generateInsightTool = (): BuiltinSkillBoundedTool => {
  return {
    id: GENERATE_INSIGHT_TOOL_ID,
    type: ToolType.builtin,
    description: `Generate and store structured Automatic Troubleshooting insights.

This tool MUST ALWAYS be called.

This tool creates structured insights for persisting the results of the troubleshooting session.

**When to use:**
- When a conclusion has been reached`,
    schema: generateInsightSchema,
    handler: async (
      { problemDescription, remediation, endpointIds, data },
      { modelProvider, logger }
    ) => {
      if (!data || data.length === 0) {
        return {
          results: [],
        };
      }

      try {
        const model = await modelProvider.getDefaultModel();
        const graph = createGenerateInsightGraph({
          model,
          problemDescription,
          remediation,
          endpointIds,
          data,
        });
        const outState = await graph.invoke({});

        return { results: outState.results };
      } catch (error) {
        logger.error(`Error in ${GENERATE_INSIGHT_TOOL_ID} tool: ${error.message}`);
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
  };
};
