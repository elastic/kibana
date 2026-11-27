/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { withIdentifierRule } from '../with_identifier_rule';
import systemPromptText from './system_prompt.text';

export const TOOL_CALL_HEALTH_TOOL_NAME = 'score_tool_call_health';

/** The longest summary the model is asked for; the judge trims longer ones. */
export const MAX_SUMMARY_CHARS = 200;

export const toolCallHealthOutputSchema = lazySchema(() =>
  z.object({
    failed_calls: z.array(z.number()),
    failed_summary: z.string().optional(),
    empty_calls: z.array(z.number()),
    empty_summary: z.string().optional(),
  })
);

export type ToolCallHealthOutput = z.infer<typeof toolCallHealthOutputSchema>;

const callNumbersSchema = {
  type: 'array',
  items: { type: 'number' },
} as const;

const summarySchema = {
  type: 'string',
  maxLength: MAX_SUMMARY_CHARS,
} as const;

export const toolCallHealthPrompt = createPrompt({
  name: 'nightshift_tool_call_health',
  description:
    'Finds the tool calls of a nightshift investigation that failed or returned no data, including "successful" calls that did not achieve their purpose',
  input: lazySchema(() =>
    z.object({
      question: z.string(),
      toolCalls: z.string(),
    })
  ),
})
  .version({
    system: {
      mustache: {
        template: withIdentifierRule(systemPromptText),
      },
    },
    template: {
      mustache: {
        template: [
          '## Question (context only)',
          '{{{question}}}',
          '',
          '## Tool calls (everything the agent called, in order)',
          '{{{toolCalls}}}',
          '',
          'List the failed and the no-data calls, then call the `score_tool_call_health` tool.',
        ].join('\n'),
      },
    },
    tools: {
      [TOOL_CALL_HEALTH_TOOL_NAME]: {
        description: 'Return the failed and the no-data tool calls.',
        schema: {
          type: 'object',
          properties: {
            failed_calls: {
              ...callNumbersSchema,
              description: 'Numbers of the calls that failed to do what the agent intended.',
            },
            failed_summary: {
              ...summarySchema,
              description: `Why the most important failed calls failed, naming them by number, in at most ${MAX_SUMMARY_CHARS} characters. Empty when none failed.`,
            },
            empty_calls: {
              ...callNumbersSchema,
              description: 'Numbers of the calls that ran correctly but returned no data.',
            },
            empty_summary: {
              ...summarySchema,
              description: `Which no-data calls matter most and what they were looking for, naming them by number, in at most ${MAX_SUMMARY_CHARS} characters. Empty when none came back empty.`,
            },
          },
          required: ['failed_calls', 'failed_summary', 'empty_calls', 'empty_summary'],
        },
      },
    },
  } as const)
  .get();
