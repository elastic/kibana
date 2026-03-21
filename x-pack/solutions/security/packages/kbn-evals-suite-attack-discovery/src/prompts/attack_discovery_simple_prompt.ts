/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';

/**
 * Simplified Attack Discovery prompt for OSS model compatibility
 *
 * Reduces schema complexity:
 * - Fewer required fields
 * - Simpler structure
 * - More explicit instructions
 */
export const AttackDiscoverySimplePrompt = createPrompt({
  name: 'attack_discovery_simple',
  description: 'Simplified attack discovery for OSS models',
  input: z.object({
    alerts: z.array(z.string()),
  }),
})
  .version({
    system: {
      mustache: {
        template:
          'You are a security analyst. Analyze the alerts and identify attack patterns. You MUST call the generate_insights function with your findings.',
      },
    },
    template: {
      mustache: {
        template:
          'Analyze these security alerts and identify attack patterns:\n\n{{#alerts}}{{{.}}}\n\n{{/alerts}}\n\nCall the generate_insights function with your analysis.',
      },
    },
    toolChoice: {
      function: 'generate_insights',
    },
    tools: {
      generate_insights: {
        description: 'Report identified attack patterns',
        schema: {
          type: 'object',
          properties: {
            attacks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Attack name' },
                  summary: { type: 'string', description: 'Brief description' },
                  alert_ids: { type: 'array', items: { type: 'string' }, description: 'Related alert IDs' },
                },
                required: ['title', 'summary'],
              },
            },
          },
          required: ['attacks'],
        },
      },
    },
  } as const)
  .get();
