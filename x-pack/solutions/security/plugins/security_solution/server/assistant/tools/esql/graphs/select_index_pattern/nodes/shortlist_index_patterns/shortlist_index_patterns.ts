/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { z } from '@kbn/zod';
import zodToJsonSchema from 'zod-to-json-schema';
import type { SelectIndexPatternAnnotation } from '../../state';
import type { CreateLlmInstance } from '../../../../utils/common';

const getStructuredOutputSchema = (state: typeof SelectIndexPatternAnnotation.State) => {
  return z
    .object({
      shortlistedIndexPatterns: z
        .array(z.string())
        .describe('Shortlisted index patterns')
        .superRefine((value, ctx) => {
          if (value.length !== new Set(value).size) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `No duplicates allowed.`,
            });
          }

          const hallucinated = value.filter(
            (indexPattern) => !state.indexPatterns.includes(indexPattern)
          );
          if (hallucinated.length > 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `The following index patterns may have typos or are not valid: ${hallucinated.join(
                ', '
              )}. These are the valid options: ${state.indexPatterns.join(', ')}`,
            });
          }
        }),
    })
    .describe(
      'Object containing array of shortlisted index patterns that might be used to generate the query'
    );
};

export const getShortlistIndexPatterns = async ({
  createLlmInstance,
}: {
  createLlmInstance: CreateLlmInstance;
}) => {
  const llm = await createLlmInstance();

  return async (state: typeof SelectIndexPatternAnnotation.State) => {
    const systemMessage = new SystemMessage({
      content:
        `You are a security analyst who is an expert in Elasticsearch and particularly writing Elastic Search queries. ` +
        `You have been given a list of index patterns and an explanation of the query we would like to generate. To generate the ` +
        `query we first need to identify which index pattern should be used. To do this you short list a maximum of 3 index ` +
        `patterns that are the most likely to contain the fields required to write the query. Select a variety index patterns.` +
        `Respond only in the following schema.\n\n${JSON.stringify(
          zodToJsonSchema(getStructuredOutputSchema(state))
        )}`,
    });
    const humanMessage = new HumanMessage({
      content:
        `Available index patterns:\n${state.indexPatterns.join(
          '\n'
        )}\n\nExplanation of the query:\n\n${
          state.input?.question
        }\n\nBased on this information, please shortlist a maximum of 3 index patterns that are ` +
        `the most likely to contain the fields required to write the query. You can shortlist fewer than 3 index patterns ` +
        `if the query indicated which index to use.`,
    });

    try {
      const result = await llm
        .withStructuredOutput(getStructuredOutputSchema(state), {
          name: 'shortlistedIndexPatterns',
        })
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
