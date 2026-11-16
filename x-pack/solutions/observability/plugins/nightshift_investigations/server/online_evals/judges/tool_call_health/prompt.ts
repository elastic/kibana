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

const toolCallIssuesSchema = lazySchema(() =>
  z.array(z.object({ step: z.number(), reason: z.string() }))
);

export const toolCallHealthOutputSchema = lazySchema(() =>
  z.object({
    failed_calls: toolCallIssuesSchema,
    empty_calls: toolCallIssuesSchema,
  })
);

export type ToolCallHealthOutput = z.infer<typeof toolCallHealthOutputSchema>;

const issuesToolSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      step: { type: 'number', description: 'The number of the tool call, as in its heading.' },
      reason: { type: 'string', description: 'One short sentence on what went wrong.' },
    },
    required: ['step', 'reason'],
  },
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
              ...issuesToolSchema,
              description: 'Calls that failed to do what the agent intended.',
            },
            empty_calls: {
              ...issuesToolSchema,
              description: 'Calls that ran correctly but returned no data.',
            },
          },
          required: ['failed_calls', 'empty_calls'],
        },
      },
    },
  } as const)
  .get();
