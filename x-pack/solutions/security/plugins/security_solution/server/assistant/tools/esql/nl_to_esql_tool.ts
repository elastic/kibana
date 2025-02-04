/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { lastValueFrom } from 'rxjs';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { APP_UI_ID } from '../../../../common';
import { getPromptSuffixForOssModel } from './common';

// select only some properties of AssistantToolParams
export type ESQLToolParams = AssistantToolParams;

const TOOL_NAME = 'NaturalLanguageESQLTool';

const toolDetails = {
  id: 'nl-to-esql-tool',
  name: TOOL_NAME,
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: `You MUST use the "${TOOL_NAME}" function when the user wants to:
  - breakdown or filter ES|QL queries that are displayed on the current page
  - convert queries from another language to ES|QL
  - asks general questions about ES|QL

  ALWAYS use this tool to generate ES|QL queries or explain anything about the ES|QL query language rather than coming up with your own answer.`,
};

export const NL_TO_ESQL_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: ESQLToolParams): params is ESQLToolParams => {
    const { inference, connectorId } = params;
    return inference != null && connectorId != null;
  },
  getTool(params: ESQLToolParams) {
    if (!this.isSupported(params)) return null;

    const { connectorId, inference, logger, request, isOssModel } = params as ESQLToolParams;
    if (inference == null || connectorId == null) return null;

    const callNaturalLanguageToEsql = async (question: string) => {
      return lastValueFrom(
        naturalLanguageToEsql({
          client: inference.getClient({ request }),
          connectorId,
          input: question,
          functionCalling: 'auto',
          logger,
        })
      );
    };

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description:
        (params.description || toolDetails.description) +
        (isOssModel ? getPromptSuffixForOssModel(TOOL_NAME) : ''),
      schema: z.object({
        question: z.string().describe(`The user's exact question about ESQL`),
      }),
      func: async (input) => {
        const generateEvent = await callNaturalLanguageToEsql(input.question);
        const answer = generateEvent.content ?? 'An error occurred in the tool';

        logger.debug(`Received response from NL to ESQL tool: ${answer}`);
        return answer;
      },
      tags: ['esql', 'query-generation', 'knowledge-base'],
      // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
    }) as unknown as DynamicStructuredTool;
  },
};
