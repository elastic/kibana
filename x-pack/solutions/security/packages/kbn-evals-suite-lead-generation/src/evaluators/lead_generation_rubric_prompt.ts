/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

export const LeadGenerationRubricPrompt = createPrompt({
  name: 'lead_generation_rubric_judge',
  description: 'Judge lead generation output quality using a structured rubric',
  input: z.object({
    submission: z.string(),
    reference: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template:
          'You are an expert security analyst evaluator. Follow the rubric exactly and respond by invoking the grade tool.',
      },
    },
    template: {
      mustache: {
        template: `Evaluate the submitted threat hunting leads against the rubric below.
Grade only based on the rubric and the "expected response" when provided.

[BEGIN rubric]
1. Is the submission non-empty and not null? (leads is a non-empty array)
2. Is each lead well-formed? (has id, title, byline, description, entities, priority 1-10, observations)
3. Are the lead titles specific and relevant to the observed security signals? (not generic placeholders)
4. Do the lead descriptions provide actionable investigation guidance based on the evidence?
5. Are the entity names correctly identified and consistent with the underlying observations?
6. Are the priority scores (1-10) plausible given the severity of the observations in each lead?
7. Do the chat recommendations offer meaningful, investigation-relevant follow-up questions?
[END rubric]

[BEGIN DATA]
[BEGIN submission]
{{{submission}}}
[END submission]
[BEGIN expected response]
{{{reference}}}
[END expected response]
[END DATA]

Evaluate each rubric criterion. If at least 5 of 7 items pass (or at least 4 of the applicable items when there are no reference leads), consider the submission correct. Write your explanation per criterion, then respond with Y or N.`,
      },
    },
    toolChoice: {
      function: 'grade',
    },
    tools: {
      grade: {
        description: 'Return Y if the submission passes the rubric, else N.',
        schema: {
          type: 'object',
          properties: {
            verdict: {
              type: 'string',
              enum: ['Y', 'N'],
            },
            explanation: {
              type: 'string',
            },
          },
          required: ['verdict', 'explanation'],
        },
      },
    },
  } as const)
  .get();
