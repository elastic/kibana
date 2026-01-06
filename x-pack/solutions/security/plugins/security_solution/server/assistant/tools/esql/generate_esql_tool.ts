/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { z } from '@kbn/zod';
import { HumanMessage } from '@langchain/core/messages';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import { APP_UI_ID } from '../../../../common';
import { getPromptSuffixForOssModel } from './utils/common';
import { getGenerateEsqlGraph } from './graphs/generate_esql/generate_esql';

export type GenerateEsqlParams = Require<
  AssistantToolParams,
  'assistantContext' | 'createLlmInstance'
>;

const TOOL_NAME = 'GenerateESQLTool';

const toolDetails = {
  id: 'generate-esql-tool',
  name: TOOL_NAME,
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: `You MUST use the "${TOOL_NAME}" function when the user wants to:
  - generate an ES|QL query
  - convert queries from another language to ES|QL they can run on their cluster

  ALWAYS use this tool to generate ES|QL queries and never generate ES|QL any other way.`,
};

export const GENERATE_ESQL_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is GenerateEsqlParams => {
    const { inference, connectorId, assistantContext, createLlmInstance } = params;
    return (
      inference != null &&
      connectorId != null &&
      assistantContext != null &&
      createLlmInstance != null
    );
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { connectorId, inference, logger, request, isOssModel, esClient, createLlmInstance } =
      params as GenerateEsqlParams;

    if (inference == null || connectorId == null) return null;

    const selfHealingGraph = await getGenerateEsqlGraph({
      esClient,
      connectorId,
      inference,
      logger,
      request,
      createLlmInstance,
    });

    return tool(
      async ({ question }) => {
        const result = await selfHealingGraph.invoke(
          {
            messages: [new HumanMessage({ content: question })],
            input: { question },
          },
          { recursionLimit: 30 }
        );

        const { messages } = result;
        const lastMessage = messages[messages.length - 1];
        return lastMessage.content;
      },
      {
        name: toolDetails.name,
        description:
          (params.description || toolDetails.description) +
          (isOssModel ? getPromptSuffixForOssModel(TOOL_NAME) : ''),
        schema: z.object({
          question: z
            .string()
            .describe(
              `The user's exact question about ES|QL. Provide as much detail as possible including the name of the index and fields if the user has provided those.`
            ),
        }),
        tags: ['esql', 'query-generation', 'knowledge-base'],
      }
    );
  },
};
