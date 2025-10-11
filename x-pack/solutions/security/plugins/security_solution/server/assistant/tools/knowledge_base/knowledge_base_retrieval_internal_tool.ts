/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { knowledgeBaseReference, contentReferenceBlock } from '@kbn/elastic-assistant-common';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import { Document } from 'langchain/document';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

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

/**
 * Returns a tool for querying the knowledge base using the InternalToolDefinition pattern.
 */
export const knowledgeBaseRetrievalInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof knowledgeBaseRetrievalToolSchema> => {
  return {
    id: 'knowledge-base-retrieval-internal-tool',
    description: toolDescription,
    schema: knowledgeBaseRetrievalToolSchema,
    handler: async ({ query }, context) => {
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
                  query,
                },
              },
            ],
          };
        }

        // Get knowledge base document entries using the same logic as the original tool
        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          query,
          kbResource: 'user',
          required: false,
        });

        // Enrich documents with content references
        const enrichedDocs = docs.map(enrichDocument(context.contentReferencesStore));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                documents: enrichedDocs,
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
                error: 'Failed to retrieve knowledge base data',
                message: error instanceof Error ? error.message : 'Unknown error',
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

function enrichDocument(contentReferencesStore: ContentReferencesStore) {
  return (document: Document<Record<string, string>>) => {
    if (document.id == null) {
      return document;
    }
    const documentId = document.id;
    const reference = contentReferencesStore.add((p) =>
      knowledgeBaseReference(p.id, document.metadata.name, documentId)
    );
    return new Document({
      ...document,
      metadata: {
        ...document.metadata,
        citation: contentReferenceBlock(reference),
      },
    });
  };
}
