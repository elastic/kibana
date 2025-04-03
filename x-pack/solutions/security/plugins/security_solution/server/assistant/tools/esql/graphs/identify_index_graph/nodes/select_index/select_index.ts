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

import { z } from '@kbn/zod';
import type { IdentityIndexAnnotation } from '../../state';

const SelectedIndexPattern = z
  .object({
    indexPattern: z
      .string()
      .optional()
      .describe(
        'The most appropriate index pattern for the query. It should be a single index pattern that is most appropriate for the query. If there are no index patterns that match the query, it should be undefined.'
      ),
  })
  .describe('Object containing the final index pattern selected by the LLM');

export const getSelectIndexPattern = ({
  createLlmInstance,
}: {
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const llm = createLlmInstance();

  return async (state: typeof IdentityIndexAnnotation.State) => {
    const { shortlistedIndexPatternAnalysis } = state;

    const analysis = Object.values(shortlistedIndexPatternAnalysis);
    const candidateIndexPatterns = analysis.filter(
      ({ containsRequiredData }) => containsRequiredData
    );

    if (candidateIndexPatterns.length === 0) {
      // Non of the analyzed index patterns contained the required data
      return new Command({
        update: {
          selectedIndexPattern: undefined,
        },
      });
    }

    if (candidateIndexPatterns.length === 1) {
      // Exactly one index pattern contains the required data
      // We can skip the LLM and return the index pattern directly
      return new Command({
        update: {
          selectedIndexPattern: candidateIndexPatterns[0].indexPattern,
        },
      });
    }

    const humanMessage = new HumanMessage({
      content: `We have analyzed multiple index patterns to see if they contain the data required for the query. Using the analysis, please suggest an a single index pattern that is most appropriate for our query.

Query: ${state.input}

Analysis: 

${candidateIndexPatterns
  .map(({ indexPattern, analysis }) => `Index pattern '${indexPattern}'\n${analysis}`)
  .join('\n\n')}`,
    });

    const result = await llm
      .withStructuredOutput(SelectedIndexPattern, { name: 'selectedIndexPattern' })
      .invoke([humanMessage]);

    return new Command({
      update: {
        selectedIndexPattern: result.indexPattern,
      },
    });
  };
};
