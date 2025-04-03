/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
} from '@kbn/langchain/server';
import { HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import type { EsqlSelfHealingAnnotation } from '../../state';

export const getSummarizeObjective = ({
  createLlmInstance,
}: {
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const llm = createLlmInstance();

  return async (state: typeof EsqlSelfHealingAnnotation.State) => {
    const humanMessage = new HumanMessage({
      content: `This is the user's input:

\`\`\`
${state.input}
\`\`\`

Summarise what the user is trying to achieve. Do not attempt to generate any query, just summarise the user's objective. The summary should be 2 or 3 scentences.`,
    });

    const result = await llm.invoke([...state.messages, humanMessage]);

    return new Command({
      update: {
        messages: [...state.messages, humanMessage, result],
        objectiveSummary: result.content,
      },
    });
  };
};
