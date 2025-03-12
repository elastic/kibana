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
import { APP_UI_ID } from '../../../../common';
import { getPromptSuffixForOssModel } from './utils/common';
import { getEsqlSelfHealingGraph } from './esqlSelfHealingGraph';

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

  ALWAYS use this tool to generate ES|QL queries or explain anything about the ES|QL query language rather than coming up with your own answer. The tool will validate the query.`,
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

    const { connectorId, inference, logger, request, isOssModel, esClient } =
      params as ESQLToolParams;
    if (inference == null || connectorId == null) return null;

    const selfHealingGraph = getEsqlSelfHealingGraph({
      esClient,
      connectorId,
      inference,
      logger,
      request,
    });

    return tool(
      async ({ question, shouldSelfHeal }) => {
        const humanMessage = new HumanMessage({ content: question });
        const result = await selfHealingGraph.invoke({ messages: [humanMessage], shouldSelfHeal });
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
          question: z.string().describe(`The user's exact question about ESQL`),
          shouldSelfHeal: z.boolean().describe("Whether to regenerate the queries' until no errors are returned when the query is run. If the user is asking a general question about ESQL, set this to false. If the user is asking for a query, set this to true."),
        }),
        tags: ['esql', 'query-generation', 'knowledge-base'],
      }
    );
  },
};
