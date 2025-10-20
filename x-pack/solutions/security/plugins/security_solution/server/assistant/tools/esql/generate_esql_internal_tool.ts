/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { HumanMessage } from '@langchain/core/messages';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import { getGenerateEsqlGraph } from './graphs/generate_esql/generate_esql';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// Schema for the generate ES|QL tool parameters
const generateEsqlToolSchema = z.object({
  question: z
    .string()
    .min(1)
    .describe(
      `The user's exact question about ES|QL. Provide as much detail as possible including the name of the index and fields if the user has provided those.`
    ),
});

export const GENERATE_ESQL_INTERNAL_TOOL_ID = 'core.security.generate_esql';
export const GENERATE_ESQL_INTERNAL_TOOL_DESCRIPTION = `You MUST use the "GenerateESQLTool" function when the user wants to:
  - generate an ES|QL query
  - convert queries from another language to ES|QL they can run on their cluster

  ALWAYS use this tool to generate ES|QL queries and never generate ES|QL any other way.`;

/**
 * Returns a tool for generating ES|QL queries using the InternalToolDefinition pattern.
 */
export const generateEsqlInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof generateEsqlToolSchema> => {
  return {
    id: GENERATE_ESQL_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: GENERATE_ESQL_INTERNAL_TOOL_DESCRIPTION,
    schema: generateEsqlToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'],
        promptId: 'GenerateESQLTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ question }, context) => {
      try {
        // Get access to start services
        const [, pluginsStart] = await getStartServices();

        // Get the inference service and other required dependencies
        const { inference } = pluginsStart;
        if (!inference) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  error: 'Inference service is not available',
                },
              },
            ],
          };
        }

        // Get connector ID from request params
        const connectorId = context.request.params?.connectorId;
        if (!connectorId) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  error: 'Connector ID is required for ES|QL generation',
                },
              },
            ],
          };
        }

        // Create LLM instance for the graph
        const createLlmInstance = async () => {
          const { ActionsClientLlm } = await import('@kbn/elastic-assistant-plugin/server');
          const { actions } = pluginsStart;
          const actionsClient = await actions.getActionsClientWithRequest(context.request);

          return new ActionsClientLlm({
            actionsClient,
            connectorId,
            llmType: 'openai', // Default type, could be made configurable
            logger: context.logger,
            temperature: 0,
            timeout: 30000,
          });
        };

        // Create the ES|QL generation graph
        const selfHealingGraph = await getGenerateEsqlGraph({
          esClient: context.esClient.asCurrentUser,
          connectorId,
          inference,
          logger: context.logger,
          request: context.request,
          createLlmInstance,
        });

        // Execute the graph
        const result = await selfHealingGraph.invoke(
          {
            messages: [new HumanMessage({ content: question })],
            input: { question },
          },
          { recursionLimit: 30 }
        );

        const { messages } = result;
        const lastMessage = messages[messages.length - 1];
        const generatedQuery = lastMessage.content;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                query: generatedQuery,
                question,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error('Error in generate ES|QL tool:', error);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error generating ES|QL query: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['esql', 'query-generation', 'knowledge-base'],
  };
};
