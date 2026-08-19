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
 *
 * Fields the evaluators judge (language, type, severity, risk_score, interval, from) are
 * deliberately loose: a strict type here would fail the whole parse on an invalid value, the
 * rule would extract as undefined, and every evaluator would return N/A — the invalid value
 * must survive parsing so the responsible evaluator can score it 0.
 *
 */
export const draftRuleSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    query: z.string(),
    language: z.string(),
    type: z.string(),
    severity: z.string(),
    risk_score: z.unknown(),
    interval: z.unknown(),
    from: z.unknown(),
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
