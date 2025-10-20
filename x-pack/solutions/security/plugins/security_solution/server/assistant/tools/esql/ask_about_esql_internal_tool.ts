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
import { lastValueFrom } from 'rxjs';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

// Schema for the ask about ES|QL tool parameters
const askAboutEsqlToolSchema = z.object({
  question: z.string().min(1).describe(`The user's exact question about ESQL`),
});

export const ASK_ABOUT_ESQL_INTERNAL_TOOL_ID = 'core.security.ask_about_esql';
export const ASK_ABOUT_ESQL_INTERNAL_TOOL_DESCRIPTION = `You MUST use the "AskAboutESQLTool" function when the user:
- asks for help with ES|QL
- asks about ES|QL syntax
- asks for ES|QL examples
- asks for ES|QL documentation
- asks for ES|QL best practices
- asks for ES|QL optimization

Never use this tool when the user wants to generate a ES|QL for their data.`;

/**
 * Returns a tool for asking about ES|QL using the InternalToolDefinition pattern.
 */
export const askAboutEsqlInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof askAboutEsqlToolSchema> => {
  return {
    id: ASK_ABOUT_ESQL_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: ASK_ABOUT_ESQL_INTERNAL_TOOL_DESCRIPTION,
    schema: askAboutEsqlToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'],
        promptId: 'AskAboutESQLTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ question }, context) => {
      try {
        // Get access to start services
        const [, pluginsStart] = await getStartServices();

        // Get the inference service
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
        const connectorId = (context.request.params as { connectorId?: string })?.connectorId;
        if (!connectorId) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  error: 'Connector ID is required for ES|QL documentation',
                },
              },
            ],
          };
        }

        // Call the natural language to ES|QL service for documentation
        const callNaturalLanguageToEsql = async (question: string) => {
          return lastValueFrom(
            naturalLanguageToEsql({
              client: inference.getClient({ request: context.request }),
              connectorId,
              input: question,
              functionCalling: 'auto',
              logger: context.logger,
            })
          );
        };

        const generateEvent = await callNaturalLanguageToEsql(question);
        const answer = generateEvent.content ?? 'An error occurred in the tool';

        context.logger.debug(`Received response from NL to ESQL tool: ${answer}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                answer,
                question,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error('Error in ask about ES|QL tool:', error);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error getting ES|QL documentation: ${
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
