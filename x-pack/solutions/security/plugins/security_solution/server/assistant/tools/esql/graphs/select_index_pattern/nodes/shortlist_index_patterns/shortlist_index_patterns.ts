/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { z } from '@kbn/zod';
import type { SelectIndexPatternAnnotation } from '../../state';
import type { CreateLlmInstance } from '../../../../utils/common';

const ShortlistedIndexPatterns = z
  .object({
    shortlistedIndexPatterns: z.array(z.string()).describe('Shortlisted index patterns'),
  })
  .describe(
    'Object containing array of shortlisted index patterns that might be used to generate the query'
  );

export const getShortlistIndexPatterns = async ({
  createLlmInstance,
}: {
  createLlmInstance: CreateLlmInstance;
}) => {
  const llm = await createLlmInstance();

  return async (state: typeof SelectIndexPatternAnnotation.State) => {
    const systemMessage = new SystemMessage({
      content: `You are a security analyst who is an expert in Elasticsearch and particularly writing Elastic Search queries. You have been given a list of index patterns and an explanation of the query we would like to generate. 
To generate the query we first need to identify which index pattern should be used. To do this you short list a maximum of 3 index patterns that are the most likely to contain the fields required to write the query. Select a variety index patterns.`,
    });
    const humanMessage = new HumanMessage({
      content: `Available index patterns:\n ${state.indexPatterns.join(
        '\n'
      )} \n\n Explanation of the query: \n\n ${
        state.input?.question
      } \n\n Based on this information, please shortlist a maximum of 3 index patterns that are the most likely to contain the fields required to write the query.`,
    });

    try {
      const result = await llm
        .withStructuredOutput(ShortlistedIndexPatterns, { name: 'shortlistedIndexPatterns' })
        .withRetry({
          stopAfterAttempt: 3,
        })
        .invoke([systemMessage, humanMessage]);

      return new Command({
        update: {
          shortlistedIndexPatterns: result.shortlistedIndexPatterns,
        },
      });
    } catch (error) {
      return new Command({});
    }
  };
};
