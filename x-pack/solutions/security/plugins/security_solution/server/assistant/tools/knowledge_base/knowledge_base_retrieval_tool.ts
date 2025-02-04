/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import { Document } from 'langchain/document';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import { knowledgeBaseReference, contentReferenceBlock } from '@kbn/elastic-assistant-common';
import { APP_UI_ID } from '../../../../common';

export interface KnowledgeBaseRetrievalToolParams extends AssistantToolParams {
  kbDataClient: AIAssistantKnowledgeBaseDataClient;
}

const toolDetails = {
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description:
    "Call this for fetching details from the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Call this function when the user asks for information about themself, like 'what is my favorite...' or 'using my saved....'. Input must always be the free-text query on a single line, with no other text. You are welcome to re-write the query to be a summary of items/things to search for in the knowledge base, as a vector search will be performed to return similar results when requested. If the results returned do not look relevant, disregard and tell the user you were unable to find the information they were looking for. All requests include a `knowledge history` section which includes some existing knowledge of the user. DO NOT CALL THIS FUNCTION if the `knowledge history` sections appears to be able to answer the user's query.",
  id: 'knowledge-base-retrieval-tool',
  name: 'KnowledgeBaseRetrievalTool',
};
export const KNOWLEDGE_BASE_RETRIEVAL_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is KnowledgeBaseRetrievalToolParams => {
    const { kbDataClient, isEnabledKnowledgeBase } = params;
    return isEnabledKnowledgeBase && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { kbDataClient, logger, contentReferencesStore } =
      params as KnowledgeBaseRetrievalToolParams;
    if (kbDataClient == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: params.description || toolDetails.description,
      schema: z.object({
        query: z.string().describe(`Summary of items/things to search for in the knowledge base`),
      }),
      func: async (input) => {
        logger.debug(
          () => `KnowledgeBaseRetrievalToolParams:input\n ${JSON.stringify(input, null, 2)}`
        );

        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          query: input.query,
          kbResource: 'user',
          required: false,
        });

        if (contentReferencesStore) {
          return JSON.stringify(docs.map(enrichDocument(contentReferencesStore)));
        }

        return JSON.stringify(docs);
      },
      tags: ['knowledge-base'],
      // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
    }) as unknown as DynamicStructuredTool;
  },
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
