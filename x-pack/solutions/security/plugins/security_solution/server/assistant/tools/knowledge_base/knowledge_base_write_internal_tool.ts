/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { StartServicesAccessor } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import { getDataClientsProvider, initializeDataClients } from '../data_clients_provider';

const knowledgeBaseWriteToolSchema = z.object({
  name: z.string().describe(`This is what the user will use to refer to the entry in the future.`),
  query: z.string().describe(`Summary of items/things to save in the knowledge base`),
  required: z
    .boolean()
    .describe(
      `Whether or not the entry is required to always be included in conversations. Is only true if the user explicitly asks for it to be required or always included in conversations, otherwise this is always false.`
    )
    .default(false),
});

const toolDescription = `Call this tool for writing details to the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts.

Use this tool when the user wants to save information for future reference, such as:
- "Save this information about my investigation process"
- "Remember my preferred settings for this dashboard"
- "Store these notes about the incident response procedure"
- "Keep this information about my team's workflow"

**When calling this tool**:
- Provide a clear, descriptive name that the user can use to refer to this entry later
- Include the complete information to be saved in the query field
- Set required to true only if the user explicitly asks for this information to always be included in conversations

**Important**:
- Only use this tool when the user explicitly requests to save information
- Choose descriptive names that will help the user find the information later
- The saved information will be available for retrieval in future conversations`;
const KB_WRITE_INTERNAL_TOOL_ID = 'core.security.knowledge_base_write';
/**
 * Returns a tool for writing to the knowledge base using the InternalToolDefinition pattern.
 */
export const knowledgeBaseWriteInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof knowledgeBaseWriteToolSchema> => {
  return {
    id: KB_WRITE_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: toolDescription,
    schema: knowledgeBaseWriteToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context: context as any,
        promptId: 'KnowledgeBaseWriteTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ name, query, required }, context) => {
      try {
        // Access the assistant context directly from the tool context
        // This is the same pattern used in agent_builder_execute.ts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assistantContext = (context as any).elasticAssistant;

        let kbDataClient = null;
        if (
          assistantContext &&
          typeof assistantContext.getAIAssistantKnowledgeBaseDataClient === 'function'
        ) {
          kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
        }

        // Fallback: use data clients provider if assistant context is not available
        if (!kbDataClient) {
          const dataClientsProvider = getDataClientsProvider(getStartServices);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await initializeDataClients(context as any);
          kbDataClient = dataClientsProvider.getKnowledgeBaseDataClient();

          // Check if data clients provider is initialized
          if (!dataClientsProvider.isInitialized()) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message:
                      'The "AI Assistant knowledge base" needs to be installed. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                    name,
                    query,
                  },
                },
              ],
            };
          }
        }

        if (kbDataClient) {
          try {
            // Use createKnowledgeBaseEntry to preserve the custom name
            const entry = {
              name,
              text: query,
              type: 'document' as const,
              required: required ?? false,
              global: false, // User-specific entry, not global
              kbResource: 'user' as const,
              source: 'conversation' as const,
            };

            // Get real telemetry from the data clients provider context
            const [coreStart] = await getStartServices();
            const realTelemetry = coreStart.analytics;

            const result = await kbDataClient.createKnowledgeBaseEntry({
              knowledgeBaseEntry: entry,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              telemetry: realTelemetry as any,
            });

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: `Successfully saved "${name}" to your knowledge base. You can reference this information in future conversations.`,
                    entryId: result?.id,
                    name,
                    query,
                  },
                },
              ],
            };
          } catch (createError) {
            // If there's an error, return the error message
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: `Failed to save "${name}" to your knowledge base: ${createError.message}`,
                    name,
                    query,
                  },
                },
              ],
            };
          }
        }

        // If we can't get the KB data client, return error
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'The "AI Assistant knowledge base" needs to be installed. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                name,
                query,
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'The "AI Assistant knowledge base" needs to be installed. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                name,
                query,
              },
            },
          ],
        };
      }
    },
    tags: ['knowledge-base', 'security'],
  };
};
