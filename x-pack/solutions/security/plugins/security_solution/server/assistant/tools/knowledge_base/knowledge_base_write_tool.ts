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
import { DocumentEntryType } from '@kbn/elastic-assistant-common';
import type { KnowledgeBaseEntryCreateProps } from '@kbn/elastic-assistant-common';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { APP_UI_ID } from '../../../../common';

export interface KnowledgeBaseWriteToolParams extends AssistantToolParams {
  kbDataClient: AIAssistantKnowledgeBaseDataClient;
  telemetry: AnalyticsServiceSetup;
}

const toolDetails = {
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description:
    "Call this for writing details to the user's knowledge base. The knowledge base contains useful information the user wants to store between conversation contexts. Input will be the summarized knowledge base entry to store, a short UI friendly name for the entry, and whether or not the entry is required.",
  id: 'knowledge-base-write-tool',
  name: 'KnowledgeBaseWriteTool',
};
export const KNOWLEDGE_BASE_WRITE_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is KnowledgeBaseWriteToolParams => {
    const { isEnabledKnowledgeBase, kbDataClient } = params;
    return isEnabledKnowledgeBase && kbDataClient != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { telemetry, kbDataClient, logger } = params as KnowledgeBaseWriteToolParams;
    if (kbDataClient == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: params.description || toolDetails.description,
      schema: z.object({
        name: z
          .string()
          .describe(`This is what the user will use to refer to the entry in the future.`),
        query: z.string().describe(`Summary of items/things to save in the knowledge base`),
        required: z
          .boolean()
          .describe(
            `Whether or not the entry is required to always be included in conversations. Is only true if the user explicitly asks for it to be required or always included in conversations, otherwise this is always false.`
          )
          .default(false),
      }),
      func: async (input) => {
        logger.debug(
          () => `KnowledgeBaseWriteToolParams:input\n ${JSON.stringify(input, null, 2)}`
        );

        const knowledgeBaseEntry: KnowledgeBaseEntryCreateProps = {
          name: input.name,
          kbResource: 'user',
          source: 'conversation',
          required: input.required,
          text: input.query,
          type: DocumentEntryType.value,
        };

        logger.debug(() => `knowledgeBaseEntry\n ${JSON.stringify(knowledgeBaseEntry, null, 2)}`);
        const resp = await kbDataClient.createKnowledgeBaseEntry({ knowledgeBaseEntry, telemetry });

        if (resp == null) {
          return "I'm sorry, but I was unable to add this entry to your knowledge base.";
        }
        return "I've successfully saved this entry to your knowledge base. You can ask me to recall this information at any time.";
      },
      tags: ['knowledge-base'],
      // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
    }) as unknown as DynamicStructuredTool;
  },
};
