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
import { Document } from 'langchain/document';
import { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';

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
          } catch (error) {
            // Ignore error and continue with fallback
          }
        }

        // Fallback: create the knowledge base data client manually if context method doesn't work
        if (!kbDataClient) {
          kbDataClient = new AIAssistantKnowledgeBaseDataClient({
            logger: context.logger.get('knowledgeBase'),
            currentUser,
            elasticsearchClientPromise: Promise.resolve(context.esClient.asInternalUser),
            indexPatternsResourceName: '.kibana-elastic-ai-assistant-knowledge-base',
            ingestPipelineResourceName:
              '.kibana-elastic-ai-assistant-ingest-pipeline-knowledge-base',
            getElserId: async () => 'elser',
            getIsKBSetupInProgress: () => false,
            getProductDocumentationStatus: () =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Promise.resolve({ status: 'not_installed' as const } as any),
            kibanaVersion: pluginsStart.elasticAssistant.kibanaVersion,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ml: {} as any,
            elserInferenceId: undefined,
            setIsKBSetupInProgress: () => {},
            spaceId,
            manageGlobalKnowledgeBaseAIAssistant: false,
            getTrainedModelsProvider: () => {
              // Return a mock provider since we don't have access to ml plugin in this context
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return {} as any;
            },
          });
        }

        // Skip availability check since manually created client doesn't have proper ML config
        // Go straight to trying to query the KB content - if KB is installed, this should work

        // Get knowledge base document entries for Security Labs
        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          kbResource: SECURITY_LABS_RESOURCE,
          query: question,
        });

        if (docs.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message:
                    'No Security Labs content found for your query. The knowledge base may not contain Security Labs content yet.',
                  question,
                },
              },
            ],
          };
        }

        // Convert documents to the format expected by the tool
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const citedDocs = docs.map((doc: any) => {
          return new Document({
            id: doc.id,
            pageContent: doc.pageContent,
            metadata: doc.metadata,
          });
        });

        // Limit content size (similar to original tool)
        const result = JSON.stringify(citedDocs).substring(0, 20000);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                content: result,
                documents: citedDocs,
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
