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
import { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import { Document } from 'langchain/document';

const knowledgeBaseRetrievalToolSchema = z.object({
  query: z.string().describe(`Summary of items/things to search for in the knowledge base`),
});

const toolDescription = `Call this tool to fetch information from the user's knowledge base. The knowledge base contains useful details the user has saved between conversation contexts.

Use this tool **only in the following cases**:

1. When the user asks a question about their personal, organizational, saved, or previously provided information/knowledge, such as:
- "What was the detection rule I saved for unusual AWS API calls?"
- "Using my saved investigation notes, what did I find about the incident last Thursday?"
- "What are my preferred index patterns?"
- "What did I say about isolating hosts?"
- "What is my favorite coffee spot near the office?" *(non-security example)*

2. Always call this tool when the user's query includes phrases like:**
- "my favorite"
- "what did I say about"
- "my saved"
- "my notes"
- "my preferences"
- "using my"
- "what do I know about"
- "based on my saved knowledge"

3. When you need to retrieve saved information the user has stored in their knowledge base, whether it's security-related or not.

**Do NOT call this tool if**:
- The \`knowledge history\` section already answers the user's question.
- The user's query is about general knowledge not specific to their saved information.

**When calling this tool**:
- Provide only the user's free-text query as the input, rephrased if helpful to clarify the search intent.
- Format the input as a single, clean line of text.

Example:
- User query: "What did I note about isolating endpoints last week?"
- Tool input: "User notes about isolating endpoints."

If no relevant information is found, inform the user you could not locate the requested information.

**Important**:
- Always check the \`knowledge history\` section first for an answer.
- Only call this tool if the user's query is explicitly about their own saved data or preferences.`;
const KB_RETRIEVAL_INTERNAL_TOOL_ID = 'core.security.knowledge_base_retrieval';
/**
 * Returns a tool for querying the knowledge base using the InternalToolDefinition pattern.
 */
export const knowledgeBaseRetrievalInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof knowledgeBaseRetrievalToolSchema> => {
  return {
    id: KB_RETRIEVAL_INTERNAL_TOOL_ID,
    type: ToolType.builtin,
    description: toolDescription,
    schema: knowledgeBaseRetrievalToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as any, // Type cast to bypass strict type checking
        promptId: 'KnowledgeBaseRetrievalTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ query }, context) => {
      try {
        console.log(`[KB_RETRIEVAL_TOOL] Starting handler for query: ${query}`);

        // Get access to start services
        const [, pluginsStart] = await getStartServices();
        console.log(`[KB_RETRIEVAL_TOOL] Got start services`);

        // Get space ID from request
        const spaceId =
          pluginsStart.spaces?.spacesService?.getSpaceId(context.request) || 'default';
        console.log(`[KB_RETRIEVAL_TOOL] Got space ID: ${spaceId}`);

        // Get current user
        const currentUser = await pluginsStart.security.authc.getCurrentUser(context.request);
        console.log(`[KB_RETRIEVAL_TOOL] Got current user: ${currentUser?.username || 'unknown'}`);

        // Try to access the KB data client through the context (similar to agent_builder_execute.ts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assistantContext = (context as any).elasticAssistant;
        console.log(
          `[KB_RETRIEVAL_TOOL] Got assistant context: ${assistantContext ? 'SUCCESS' : 'NULL'}`
        );

        let kbDataClient = null;
        if (
          assistantContext &&
          typeof assistantContext.getAIAssistantKnowledgeBaseDataClient === 'function'
        ) {
          try {
            kbDataClient = await assistantContext.getAIAssistantKnowledgeBaseDataClient();
            console.log(
              `[KB_RETRIEVAL_TOOL] Got KB data client from context: ${
                kbDataClient ? 'SUCCESS' : 'NULL'
              }`
            );
          } catch (error) {
            console.log(
              `[KB_RETRIEVAL_TOOL] Failed to get KB data client from context: ${error.message}`
            );
          }
        }

        // Fallback: create the knowledge base data client manually if context method doesn't work
        if (!kbDataClient) {
          console.log(`[KB_RETRIEVAL_TOOL] Creating KB data client manually as fallback`);
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
        console.log(
          `[KB_RETRIEVAL_TOOL] Created KB data client: ${kbDataClient ? 'SUCCESS' : 'NULL'}`
        );

        // Skip availability check since manually created client doesn't have proper ML config
        // Go straight to trying to query the KB content - if KB is installed, this should work
        console.log(`[KB_RETRIEVAL_TOOL] Skipping availability check, trying direct KB query`);

        // Get knowledge base document entries for general knowledge base content
        console.log(`[KB_RETRIEVAL_TOOL] Querying KB for content with query: ${query}`);
        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          query,
        });
        console.log(`[KB_RETRIEVAL_TOOL] Found ${docs.length} documents`);

        if (docs.length === 0) {
          console.log(`[KB_RETRIEVAL_TOOL] No documents found - returning no content message`);
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message:
                    'No relevant information found in your knowledge base for this query. You may need to add more content to your knowledge base.',
                  query,
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
        console.log(
          `[KB_RETRIEVAL_TOOL] Returning ${citedDocs.length} documents with content length: ${result.length}`
        );

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
        console.error(`[KB_RETRIEVAL_TOOL] Error in handler: ${error.message}`);
        console.error(`[KB_RETRIEVAL_TOOL] Error stack: ${error.stack}`);
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message:
                  'The "AI Assistant knowledge base" needs to be installed. Navigate to the Knowledge Base page in the AI Assistant Settings to install it.',
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
