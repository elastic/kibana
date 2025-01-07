/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';

import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { SECURITY_LABS_RESOURCE } from '@kbn/elastic-assistant-plugin/server/routes/knowledge_base/constants';
import { APP_UI_ID } from '../../../../common';

const toolDetails = {
  description:
    'Call this for knowledge from Elastic Security Labs content, which contains information on malware, attack techniques, and more.',
  id: 'security-labs-knowledge-base-tool',
  name: 'SecurityLabsKnowledgeBaseTool',
};
export const SECURITY_LABS_KNOWLEDGE_BASE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AssistantToolParams => {
    const { kbDataClient, isEnabledKnowledgeBase } = params;
    return isEnabledKnowledgeBase && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { kbDataClient } = params as AssistantToolParams;
    if (kbDataClient == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
        question: z
          .string()
          .describe(
            `Key terms to retrieve Elastic Security Labs content for, like specific malware names or attack techniques.`
          ),
      }),
      func: async (input) => {
        const docs = await kbDataClient.getKnowledgeBaseDocumentEntries({
          kbResource: SECURITY_LABS_RESOURCE,
          query: input.question,
        });
        // TODO: Token pruning
        return JSON.stringify(docs).substring(0, 20000);
      },
      tags: ['security-labs', 'knowledge-base'],
      // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
    }) as unknown as DynamicStructuredTool;
  },
};
