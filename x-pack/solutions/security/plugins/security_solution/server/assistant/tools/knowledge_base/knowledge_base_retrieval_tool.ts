/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { Document } from 'langchain/document';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import { knowledgeBaseReference, contentReferenceBlock } from '@kbn/elastic-assistant-common';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { APP_UI_ID } from '../../../../common';

export type KnowledgeBaseRetrievalToolParams = Require<AssistantToolParams, 'kbDataClient'>;

const toolDetails = {
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: `Call this tool to fetch information from the user's knowledge base. The knowledge base contains useful details the user has saved between conversation contexts.

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
- Only call this tool if the user's query is explicitly about their own saved data or preferences.`,
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
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { kbDataClient, logger, contentReferencesStore } =
      params as KnowledgeBaseRetrievalToolParams;
    if (kbDataClient == null) return null;

    return tool(
      async (input) => {
        logger.debug(
          () => `KnowledgeBaseRetrievalToolParams:input\n ${JSON.stringify(input, null, 2)}`
        );

        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          query: input.query,
          kbResource: 'user',
          required: false,
        });

        return JSON.stringify(docs.map(enrichDocument(contentReferencesStore)));
      },
      {
        name: toolDetails.name,
        description: params.description || toolDetails.description,
        schema: z.object({
          query: z.string().describe(`Summary of items/things to search for in the knowledge base`),
        }),
        tags: ['knowledge-base'],
      }
    );
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
