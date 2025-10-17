/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import { getDataClientsProvider, initializeDataClients } from '../data_clients_provider';

const securityLabsKnowledgeToolSchema = z.object({
  question: z
    .string()
    .describe(
      `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
    ),
});

export const SECURITY_LABS_KNOWLEDGE_INTERNAL_TOOL_DESCRIPTION =
  'Call this FIRST when users explicitly ask about "Elastic Security Labs", "Security Labs research", "latest from Security Labs", "Security Labs updates", "threat intelligence from Security Labs", or "Security Labs content". This tool contains Elastic Security Labs threat intelligence, malware analysis, attack technique research, and security research articles. DO NOT use product documentation tool for Security Labs queries - this tool provides the authoritative Security Labs content.';

export const securityLabsKnowledgeInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof securityLabsKnowledgeToolSchema> => {
  return {
    type: ToolType.builtin,
    id: 'core.security.security_labs_knowledge',
    description: SECURITY_LABS_KNOWLEDGE_INTERNAL_TOOL_DESCRIPTION,
    schema: securityLabsKnowledgeToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: {
          request: context?.request as KibanaRequest<
            { connectorId?: string },
            unknown,
            { actionTypeId?: string; model?: string }
          >,
        },
        promptId: 'SecurityLabsKnowledgeBaseTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ question }, context) => {
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
                      'The "AI Assistant knowledge base" needs to be installed, containing the Security Labs content. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                    question,
                  },
                },
              ],
            };
          }
        }

        if (kbDataClient) {
          // Get knowledge base document entries for Security Labs
          const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
            kbResource: SECURITY_LABS_RESOURCE,
            query: question,
          });

          if (docs && docs.length > 0) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    content: docs.map((doc: any) => doc.pageContent).join('\n\n'),
                    question,
                  },
                },
              ],
            };
          } else {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message:
                      'No Security Labs content found for your question. The knowledge base may not contain the Security Labs content yet.',
                    question,
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
                  'The "AI Assistant knowledge base" needs to be installed, containing the Security Labs content. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                question,
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
                  'The "AI Assistant knowledge base" needs to be installed, containing the Security Labs content. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
                question,
              },
            },
          ],
        };
      }
    },
    tags: ['security-labs', 'knowledge-base'],
  };
};
