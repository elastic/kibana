/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { gradeSchema } from '../run_judge';
import systemPromptText from './system_prompt.text';

export const CORTEX_PAGE_INFLUENCE_TOOL_NAME = 'score_cortex_page_influence';

/** Generous bound on judge text; explanations are capped separately before persisting. */
const MAX_JUDGE_TEXT_LENGTH = 100_000;

/** The judge cuts the pages and the answer to this length, below the prompt bound. */
export const MAX_JUDGE_INPUT_CHARS = 90_000;

export const cortexPageInfluenceOutputSchema = lazySchema(() =>
  z.object({
    pages_used: z.array(z.string().max(512)).max(1_000),
    influence: gradeSchema,
    influence_reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
    missed_influence: gradeSchema,
    missed_influence_reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export type CortexPageInfluenceOutput = z.infer<typeof cortexPageInfluenceOutputSchema>;

export const cortexPageInfluencePrompt = createPrompt({
  name: 'nightshift_cortex_page_influence',
  description:
    'Grades how the Cortex pages a Nightshift investigator read shaped its answer, and how much more they could have',
  input: lazySchema(() =>
    z.object({
      task: z.string().max(MAX_JUDGE_TEXT_LENGTH),
      pages: z.string().max(MAX_JUDGE_TEXT_LENGTH),
      answer: z.string().max(MAX_JUDGE_TEXT_LENGTH),
    })
  ),
})
  .version({
    system: {
      mustache: {
        template: systemPromptText,
      },
    },
    template: {
      mustache: {
        template:
          'Investigation task:\n{{{task}}}\n\nCortex pages the agent read:\n{{{pages}}}\n\nAgent final answer:\n{{{answer}}}',
      },
    },
    tools: {
      [CORTEX_PAGE_INFLUENCE_TOOL_NAME]: {
        description:
          'Return how the Cortex pages influenced the answer and how much more they could have.',
        schema: {
          type: 'object',
          properties: {
            pages_used: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Ids of the pages whose content the answer relies on, named or paraphrased. Use only ids from the provided pages.',
            },
            influence: {
              type: 'number',
              description: 'Integer 0-3: how much the pages actually shaped the answer.',
            },
            influence_reasoning: {
              type: 'string',
              description:
                'One or two sentences: how the pages shaped the answer, or that they did not.',
            },
            missed_influence: {
              type: 'number',
              description:
                'Integer 0-3: how much useful page content the answer left unused or contradicted.',
            },
            missed_influence_reasoning: {
              type: 'string',
              description:
                'One or two sentences: what the pages offered that the answer could have used.',
            },
          },
          required: [
            'pages_used',
            'influence',
            'influence_reasoning',
            'missed_influence',
            'missed_influence_reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
