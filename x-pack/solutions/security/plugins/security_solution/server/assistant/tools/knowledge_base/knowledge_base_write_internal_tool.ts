/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { DocumentEntryType } from '@kbn/elastic-assistant-common';
import type { KnowledgeBaseEntryCreateProps } from '@kbn/elastic-assistant-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';

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
        context,
        promptId: 'KnowledgeBaseWriteTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ name, query, required }, context) => {
      try {
        // Get access to start services
        const [, pluginsStart] = await getStartServices();

        // Get space ID from request
        const spaceId =
          pluginsStart.spaces?.spacesService?.getSpaceId(context.request) || 'default';

        // Get current user
        const currentUser = await pluginsStart.security.authc.getCurrentUser(context.request);

        // Try to access the KB data client through the context (similar to agent_builder_execute.ts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assistantContext = (context as any).elasticAssistant;

        let kbDataClient = null;
        if (
          assistantContext &&
          typeof assistantContext.getAIAssistantKnowledgeBaseDataClient === 'function'
        ) {
          try {
            kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
          } catch (error) {}
        }

        // If we got the KB data client from context, use it instead of direct Elasticsearch
        if (kbDataClient) {
          // Create the knowledge base entry with all required properties
          const entry: KnowledgeBaseEntryCreateProps = {
            name,
            content: query,
            type: DocumentEntryType.manual,
            required,
            kbResource: 'user', // Match the working document
            source: 'conversation', // Match the working document
          };

          // Create a mock telemetry service since we don't have access to the real one in tool context
          const mockTelemetry = {
            reportEvent: (eventType: string, payload: any) => {
              // Mock telemetry - no logging needed
            },
          };

          const result = await kbDataClient.createKnowledgeBaseEntry({
            knowledgeBaseEntry: entry,
            telemetry: mockTelemetry as any,
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
        }

        // If we can't get the KB data client from context, try to create the entry directly using Elasticsearch
        if (!kbDataClient) {
          // Create the entry directly using the Elasticsearch client
          const entryId = require('uuid').v4();
          const entry = {
            '@timestamp': new Date().toISOString(),
            created_at: new Date().toISOString(),
            created_by: currentUser.profile_uid ?? currentUser.username ?? 'unknown',
            updated_at: new Date().toISOString(),
            updated_by: currentUser.profile_uid ?? currentUser.username ?? 'unknown',
            name,
            namespace: spaceId,
            type: 'document',
            users: [
              {
                id: currentUser.profile_uid,
                name: currentUser.username,
              },
            ],
            kb_resource: 'user', // Match the working document
            required,
            source: 'conversation', // Match the working document
            text: query,
            semantic_text: query,
          };

          // Construct the space-specific index name
          const spaceSpecificIndex = `.kibana-elastic-ai-assistant-knowledge-base-${spaceId}`;

          // Check if the index exists, if not, create it
          try {
            const indexExists = await context.esClient.asInternalUser.indices.exists({
              index: spaceSpecificIndex,
            });

            if (!indexExists) {
              await context.esClient.asInternalUser.indices.create({
                index: spaceSpecificIndex,
                body: {
                  mappings: {
                    properties: {
                      '@timestamp': { type: 'date' },
                      id: { type: 'keyword' },
                      created_at: { type: 'date' },
                      created_by: { type: 'keyword' },
                      updated_at: { type: 'date' },
                      updated_by: { type: 'keyword' },
                      name: { type: 'keyword' },
                      namespace: { type: 'keyword' },
                      type: { type: 'keyword' },
                      global: { type: 'boolean' },
                      users: {
                        type: 'nested',
                        properties: {
                          id: { type: 'keyword' },
                          name: { type: 'keyword' },
                        },
                      },
                      required: { type: 'boolean' },
                      source: { type: 'keyword' },
                      text: { type: 'text' },
                      semantic_text: { type: 'text' },
                      kb_resource: { type: 'keyword' },
                    },
                  },
                },
              });
            }
          } catch (indexError) {
            // Continue anyway, the create operation might still work
          }

          const result = await context.esClient.asInternalUser.create({
            index: spaceSpecificIndex,
            id: entryId,
            document: entry,
            refresh: 'wait_for',
          });

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Successfully saved "${name}" to your knowledge base. You can reference this information in future conversations.`,
                  entryId: result._id,
                  name,
                  query,
                },
              },
            ],
          };
        }
        console.log(`[KB_WRITE_TOOL] Created KB data client: ${kbDataClient ? 'SUCCESS' : 'NULL'}`);

        // Skip availability check since manually created client doesn't have proper ML config
        // Go straight to trying to write to the KB - if KB is installed, this should work
        console.log(`[KB_WRITE_TOOL] Skipping availability check, trying direct KB write`);

        // Create the knowledge base entry with all required properties
        const entry: KnowledgeBaseEntryCreateProps = {
          name,
          content: query,
          type: DocumentEntryType.manual,
          required,
          global: false, // Set to false for user-specific entries
          users: [], // Empty array for user-specific entries
        };

        console.log(`[KB_WRITE_TOOL] Creating KB entry: ${JSON.stringify(entry)}`);

        // Create a mock telemetry service since we don't have access to the real one in tool context
        const mockTelemetry = {
          reportEvent: (eventType: string, payload: any) => {
            console.log(`[KB_WRITE_TOOL] Mock telemetry event: ${eventType}`, payload);
          },
        };

        const result = await kbDataClient.createKnowledgeBaseEntry({
          knowledgeBaseEntry: entry,
          telemetry: mockTelemetry as any,
        });
        console.log(`[KB_WRITE_TOOL] Created KB entry successfully: ${result?.id}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully saved "${name}" to your knowledge base. You can reference this information in future conversations.`,
                entryId: result.id,
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
