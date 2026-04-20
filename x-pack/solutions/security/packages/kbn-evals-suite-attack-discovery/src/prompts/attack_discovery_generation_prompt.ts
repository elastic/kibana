/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

export const AttackDiscoveryGenerationPrompt = createPrompt({
  name: 'attack_discovery_generation',
  description: 'Generate attack discovery insights from alert context',
  input: z.object({
    prompt: z.string(),
    alerts: z.array(z.string()),
    combinedMaybePartialResults: z.string().optional(),
    continuePrompt: z.string().optional(),
  }),
})
  .version({
    system: {
      mustache: {
        template:
          'You are a world-class cyber security analyst. You must follow the user instructions and respond by invoking the generate tool.',
      },
    },
    template: {
      mustache: {
        template:
          '{{{prompt}}}\n\nUse context from the following alerts to provide insights:\n\n"""\n{{#alerts}}{{{.}}}\n\n{{/alerts}}"""\n\n{{#combinedMaybePartialResults}}\n{{#continuePrompt}}\n{{{continuePrompt}}}\n\n"""\n{{{combinedMaybePartialResults}}}\n"""\n{{/continuePrompt}}\n{{/combinedMaybePartialResults}}\n',
      },
    },
    toolChoice: {
      function: 'generate',
    },
    tools: {
      generate: {
        description: 'Generate attack discovery insights as structured JSON.',
        schema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summaryMarkdown: { type: 'string' },
                  detailsMarkdown: { type: 'string' },
                  entitySummaryMarkdown: { type: 'string' },
                  mitreAttackTactics: { type: 'array', items: { type: 'string' } },
                  alertIds: { type: 'array', items: { type: 'string' } },
                },
                required: ['title', 'summaryMarkdown', 'detailsMarkdown', 'alertIds'],
              },
            },
          },
          required: ['insights'],
        },
      },
    },
  } as const)
  .get();
