/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import { SystemMessage } from '@langchain/core/messages';
import type {
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
} from '@kbn/langchain/server';
import { z } from '@kbn/zod';
import type { CheckIfIndexContainsRequiredFieldsAnnotation } from '../../state';

const IndexPatternAnalysis = z
  .object({
    containsRequiredData: z.boolean().describe('Whether the index contains the required data'),
    analysis: z.string().describe('The analysis of the index mapping'),
  })
  .describe('Object containing the index patterns derived from the index names');

export const getRespond = ({
  createLlmInstance,
}: {
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const llm = createLlmInstance();

  return async (state: typeof CheckIfIndexContainsRequiredFieldsAnnotation.State) => {
    const lastMessage = state.messages[state.messages.length - 1];

    const result = await llm
      .withStructuredOutput(IndexPatternAnalysis, { name: 'indexPatternAnalysis' })
      .invoke([
        new SystemMessage({
          content: `You are an expert in parsing text into the correct format. Don't add any additional information to the response.`,
        }),
        lastMessage,
      ]);

    return new Command({
      update: {
        containsRequiredData: result.containsRequiredData,
        analysis: result.analysis,
      },
    });
  };
};
