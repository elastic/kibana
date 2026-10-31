/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { z, lazySchema } from '@kbn/zod/v4';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { GENERATE_INSIGHT_TOOL_ID } from '../..';
import { createGenerateInsightGraph } from './graph';

const generateInsightSchema = lazySchema(() =>
  z.object({
    problemDescription: z
      .string()
      .min(1)
      .describe('A brief description of the original problem being diagnosed.'),
    remediation: z.string().min(1).describe('A detailed guide for how to remediate the problem.'),
    endpointIds: z
      .array(z.string())
      .min(1)
      .describe(
        'Elastic Agent IDs (`agent.id`) of the affected endpoints, taken from `.fleet-agents*` or endpoint metadata documents. Host names, policy IDs, and artifact IDs are not accepted.'
      ),
    data: z
      .array(z.object({}).catchall(z.unknown()))
      .min(1)
      .describe('Relevant raw unedited documents.'),
  })
);

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const INVALID_ENDPOINT_IDS_GUIDANCE =
  'endpointIds must be Elastic Agent IDs (`agent.id`) of endpoints in the current space; host names, policy IDs, and artifact IDs are not accepted. Do not call this tool again with guessed IDs. If no specific endpoint is involved, answer without persisting findings.';

const errorResult = (message: string) => ({
  results: [
    {
      type: ToolResultType.error,
      data: {
        message,
      },
    },
  ],
});

export const generateInsightTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool<typeof generateInsightSchema> => {
  return {
    id: GENERATE_INSIGHT_TOOL_ID,
    type: ToolType.builtin,
    description: `Generate and store structured Automatic Troubleshooting insights.

This tool MUST be called when the findings concern one or more specific endpoints. Do not call it when no specific endpoint is involved, and do not call it again after it returns an error.

This tool creates structured insights for persisting the results of the troubleshooting session.

**When to use:**
- When a conclusion has been reached about specific endpoints`,
    schema: generateInsightSchema,
    handler: async (
      { problemDescription, remediation, endpointIds, data },
      { spaceId, modelProvider, logger, esClient }
    ) => {
      try {
        await endpointAppContextService
          .getInternalFleetServices(spaceId)
          .ensureInCurrentSpace({ agentIds: endpointIds });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in ${GENERATE_INSIGHT_TOOL_ID} tool: ${errorMessage}`);
        return errorResult(`Error: ${errorMessage}. ${INVALID_ENDPOINT_IDS_GUIDANCE}`);
      }

      try {
        const model = await modelProvider.getDefaultModel();
        const ccsEnabled = await endpointAppContextService.isCcsEnabled();
        const graph = createGenerateInsightGraph({
          model,
          problemDescription,
          remediation,
          endpointIds,
          data,
          spaceId,
          esClient: esClient.asInternalUser,
          ccsEnabled,
        });
        const outState = await graph.invoke({});

        return { results: outState.results };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in ${GENERATE_INSIGHT_TOOL_ID} tool: ${errorMessage}`);
        return errorResult(`Error: ${errorMessage}`);
      }
    },
  };
};
