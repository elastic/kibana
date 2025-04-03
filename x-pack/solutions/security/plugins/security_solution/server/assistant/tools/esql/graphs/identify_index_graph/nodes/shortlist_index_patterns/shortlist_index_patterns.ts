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
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { z } from '@kbn/zod';
import type { IdentityIndexAnnotation } from '../../state';

const ShortlistedIndexPatterns = z
  .object({
    shortlistedIndexPatterns: z.array(z.string()).describe('Shortlisted index patterns'),
  })
  .describe(
    'Object containing array of shortlisted index patterns that might be used to generate the query'
  );

export const getShortlistIndexPatterns = ({
  createLlmInstance,
}: {
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const llm = createLlmInstance();

  return async (state: typeof IdentityIndexAnnotation.State) => {
    const systemMessage = new SystemMessage({
      content: `You are a security analyst who is an expert in Elasticsearch and particularly writing Elastic Search queries. You have been given a list of index patterns and a summary of the query that we are trying to generate. 
To generate the query we first need to identify which index pattern should be used. To do this you short list a maximum of 3 index patterns that are the most likily to contain the fields required to write the query. Select a variety index patterns.`,
    });
    const humanMessage = new HumanMessage({
      content: `These are the index patterns available:\n ${state.indexPatterns.join(
        '\n'
      )} \n\n This is a summary of the query we are trying to generate: \n\n ${
        state.objectiveSummary
      } \n\n Based on this information, please shortlist a maximum of 3 index patterns that are the most likely to contain the fields required to write the query.`,
    });

    const result = await llm
      .withStructuredOutput(ShortlistedIndexPatterns, { name: 'shortlistedIndexPatterns' })
      .invoke([systemMessage, humanMessage]);

    return new Command({
      update: {
        shortlistedIndexPatterns: result.shortlistedIndexPatterns,
        hypothesisMessages: [
          humanMessage,
          new AIMessage({
            content: `The shortlisted index patterns are: ${result.shortlistedIndexPatterns.join(
              ', '
            )}`,
          }),
        ],
      },
    });
  };
};
