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
    reference: z.string().optional(),
    criteria: z.string().optional(),
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
Grade only based on the rubric and the "expected response" when one is provided below — if no
expected response section is present, no reference exists for this example, so grade solely
against the rubric and do not penalize the submission for containing leads or for differing from
some assumed reference.

[BEGIN rubric]
1. Is the submission non-empty and not null? (leads is a non-empty array)
2. Is each lead well-formed? (has id, title, byline, description, entity, priority 1-10, observations)
3. Are the lead titles specific and relevant to the observed security signals? (not generic placeholders)
4. Do the lead descriptions provide actionable investigation guidance based on the evidence?
5. Are the entity names correctly identified and consistent with the underlying observations?
6. Are the priority scores (1-10) plausible given the severity of the observations in each lead?
7. Do the chat recommendations offer meaningful, investigation-relevant follow-up questions?
8. When a lead has related entities (topRelatedEntities) and its narrative mentions them, are they described accurately and grounded in the entity's actual data (observations, attributes, or relationship facts) — rather than name-dropped or fabricated? (It is fine for a lead to have related entities and not mention them if they aren't relevant to why the lead was surfaced.)
9. When a lead's origin is "exploratory" (surfaced by the promotion step rather than its own observations), does the narrative still ground itself in concrete facts about the entity rather than restating a generic risk statement?
[END rubric]

[BEGIN DATA]
[BEGIN submission]
{{{submission}}}
[END submission]
{{#reference}}
[BEGIN expected response]
{{{reference}}}
[END expected response]
{{/reference}}
{{#criteria}}
[BEGIN additional per-example criteria]
{{{criteria}}}
[END additional per-example criteria]
{{/criteria}}
[END DATA]

Evaluate each rubric criterion. Criteria 8 and 9 only apply to leads that have related entities or exploratory origin respectively — skip them for leads without those properties. When additional per-example criteria are provided above, they are also part of the rubric and must be evaluated. If at least 5 of the applicable items pass, consider the submission correct. Write your explanation per criterion, then respond with Y or N.`,
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
