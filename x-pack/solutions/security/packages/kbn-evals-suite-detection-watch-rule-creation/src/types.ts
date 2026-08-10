/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Zod schema for the rule object returned by the draft_creation ai.agent step.
 * All fields are optional — the agent may omit any of them.
 * Evaluators score missing fields as failures rather than throwing.
 *
 * Verify the actual shape by inspecting a real workflow execution:
 *   GET /api/workflows/executions/{id}?includeOutput=true
 */
export const draftRuleSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    query: z.string(),
    language: z.literal('esql'),
    type: z.literal('esql'),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    risk_score: z.number(),
    interval: z.string(),
    from: z.string(),
    tags: z.array(z.string()),
    threat: z.array(
      z.object({
        tactic: z.object({ id: z.string(), name: z.string() }).partial().optional(),
        technique: z
          .array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                subtechnique: z.array(z.object({ id: z.string() }).partial()).optional(),
              })
              .partial()
          )
          .optional(),
      })
    ),
  })
  .partial();

export type DraftRule = z.infer<typeof draftRuleSchema>;
