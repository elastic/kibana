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

export const CONCLUSION_QUALITY_TOOL_NAME = 'score_conclusion';

export const conclusionQualityOutputSchema = lazySchema(() =>
  z.object({
    conclusion_quality: gradeSchema,
    conclusion_reasoning: z.string(),
  })
);

export type ConclusionQualityOutput = z.infer<typeof conclusionQualityOutputSchema>;

export const conclusionQualityPrompt = createPrompt({
  name: 'nightshift_conclusion_quality',
  description: "Grades the conclusion of a Nightshift investigation from the agent's final answer",
  input: lazySchema(() =>
    z.object({
      answer: z.string(),
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
        template: 'Agent final answer:\n\n{{{answer}}}',
      },
    },
    tools: {
      [CONCLUSION_QUALITY_TOOL_NAME]: {
        description: 'Return the conclusion quality grade.',
        schema: {
          type: 'object',
          properties: {
            conclusion_quality: {
              type: 'number',
              description: 'Integer 0-3: quality score per the scoring guide.',
            },
            conclusion_reasoning: {
              type: 'string',
              description:
                'One sentence: what conclusion the agent reached and how well it is supported.',
            },
          },
          required: ['conclusion_quality', 'conclusion_reasoning'],
        },
      },
    },
  } as const)
  .get();
