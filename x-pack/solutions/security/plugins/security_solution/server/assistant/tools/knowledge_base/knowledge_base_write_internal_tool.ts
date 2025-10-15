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
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

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

/**
 * Returns a tool for writing to the knowledge base using the InternalToolDefinition pattern.
 */
export const knowledgeBaseWriteInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof knowledgeBaseWriteToolSchema> => {
  return {
    id: 'knowledge-base-write-internal-tool',
    description: toolDescription,
    schema: knowledgeBaseWriteToolSchema,
    handler: async ({ name, query, required }, context) => {
      try {
        // Get access to the elastic-assistant plugin through start services
        const [, pluginsStart] = await getStartServices();

        // Get the knowledge base data client
        const kbDataClient = await pluginsStart.elasticAssistant.getKnowledgeBaseDataClient(
          context.request
        );

        if (!kbDataClient) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: 'Knowledge base is not available or not enabled',
                  name,
                  query,
                },
              },
            ],
          };
        }

        // Create the knowledge base entry
        const knowledgeBaseEntry: KnowledgeBaseEntryCreateProps = {
          name,
          kbResource: 'user',
          source: 'conversation',
          required,
          text: query,
          type: DocumentEntryType.value,
        };

        // Create the entry in the knowledge base
        const resp = await kbDataClient.createKnowledgeBaseEntry({
          knowledgeBaseEntry,
          telemetry: pluginsStart.elasticAssistant.telemetry,
        });

        if (resp == null) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: "I'm sorry, but I was unable to add this entry to your knowledge base.",
                  name,
                  query,
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  "I've successfully saved this entry to your knowledge base. You can ask me to recall this information at any time.",
                name,
                query,
                required,
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
                error: 'Failed to write to knowledge base',
                message: error instanceof Error ? error.message : 'Unknown error',
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
