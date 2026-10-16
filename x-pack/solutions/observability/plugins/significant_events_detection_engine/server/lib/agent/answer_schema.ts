/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ENGINE_SEVERITIES, EVIDENCE_VERDICTS } from '../../../common';
import type { AgentAnswer } from './types';

const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 4_000;

/** The structured output Agent Builder asks the model for. */
export const ANSWER_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts', 'severity', 'title', 'summary'],
  properties: {
    join_decision: {
      type: 'string',
      enum: ['confirm', 'veto'],
      description: 'Only when the case has a join_proposal.',
    },
    join_reason: { type: 'string', description: 'Why the join was confirmed or vetoed.' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['evidence_id', 'verdict', 'note'],
        properties: {
          evidence_id: { type: 'string' },
          verdict: { type: 'string', enum: [...EVIDENCE_VERDICTS] },
          note: { type: 'string', description: 'What the rows show, in one sentence.' },
        },
      },
    },
    severity: { type: 'string', enum: [...ENGINE_SEVERITIES] },
    title: { type: 'string', description: 'At most 80 characters.' },
    summary: { type: 'string', description: 'Two to four sentences.' },
  },
};

/**
 * The same shape, enforced. Agent Builder only retries an empty answer, so whatever the model
 * returned is parsed here before code reads a single field.
 */
const answerSchema = lazySchema(() =>
  z.object({
    join_decision: z.enum(['confirm', 'veto']).optional(),
    join_reason: z.string().max(MAX_TEXT_LENGTH).optional(),
    verdicts: z
      .array(
        z.object({
          evidence_id: z.string().max(20),
          verdict: z.enum(EVIDENCE_VERDICTS),
          note: z.string().max(MAX_TEXT_LENGTH),
        })
      )
      .max(20),
    severity: z.enum(ENGINE_SEVERITIES),
    title: z.string().min(1).max(MAX_TITLE_LENGTH),
    summary: z.string().min(1).max(MAX_TEXT_LENGTH),
  })
);

/** Parses the model's output, or throws with what was wrong. */
export function parseAnswer(output: unknown): AgentAnswer {
  const parsed = answerSchema.safeParse(output);
  if (!parsed.success) {
    throw new Error(
      `The agent's answer does not match the schema: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`
    );
  }
  return parsed.data;
}
