/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  HYPOTHESIS_STATUSES,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_NAME_LENGTH,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_HYPOTHESES,
  MAX_IMPACT_TOOL_ENTITIES,
} from '@kbn/agentic-investigations-plugin/common';

export const FINDINGS_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

const MAX_METADATA_TEXT_LENGTH = 10_000;

export const findingsOutputSchema = lazySchema(() => {
  const hypothesisSchema = z.object({
    candidate: z.string().min(1).max(MAX_EVIDENCE_TEXT_LENGTH),
    confidence: z.number().min(0).max(1),
    status: z.enum(HYPOTHESIS_STATUSES),
    reason: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  });

  return z.object({
    summary: z.string().min(1).max(MAX_METADATA_TEXT_LENGTH),
    verdict: z.string().max(MAX_METADATA_TEXT_LENGTH).optional(),
    severity: z.enum(FINDINGS_SEVERITIES).optional(),
    impact_summary: z.string().min(1).max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
    impact_entities: z
      .array(
        z.object({
          name: z.string().min(1).max(MAX_ENTITY_NAME_LENGTH),
          type: z.string().min(1).max(MAX_ENTITY_ID_LENGTH).optional(),
        })
      )
      .max(MAX_IMPACT_TOOL_ENTITIES)
      .optional(),
    hypotheses: z.array(hypothesisSchema).max(MAX_HYPOTHESES),
  });
});

export type FindingsOutput = z.infer<typeof findingsOutputSchema>;

/** The same shape as {@link findingsOutputSchema}, for the inference client. */
export const FINDINGS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      maxLength: 800,
      description:
        'What happened, as far as the evidence shows: what deviated, when and where, and the current leading explanation. Two to four plain sentences.',
    },
    verdict: {
      type: 'string',
      maxLength: 600,
      description:
        'Only when the agent has given its final answer: the conclusion in one or two sentences, with the root cause and the mechanism. Omit while the investigation is still running.',
    },
    severity: {
      type: 'string',
      enum: FINDINGS_SEVERITIES,
      description: 'Severity of the situation investigated, decided from what was confirmed.',
    },
    impact_summary: {
      type: 'string',
      maxLength: 500,
      description:
        'The business consequence in one or two plain sentences: who or what was affected, how badly, for how long, how broadly, with measured numbers. Omit when the evidence shows no impact yet.',
    },
    impact_entities: {
      type: 'array',
      maxItems: 5,
      description:
        'Only when two or more services or components were affected in different ways, grouped at service level.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', description: 'For example service, host or database.' },
        },
        required: ['name'],
      },
    },
    hypotheses: {
      type: 'array',
      maxItems: 8,
      description:
        'Every candidate cause considered so far, each with its own confidence and status. A snapshot: it replaces the stored list.',
      items: {
        type: 'object',
        properties: {
          candidate: { type: 'string', description: 'The candidate cause, stated concretely.' },
          confidence: { type: 'number', description: 'From 0 to 1.' },
          status: { type: 'string', enum: HYPOTHESIS_STATUSES },
          reason: {
            type: 'string',
            maxLength: 300,
            description:
              'Why it was dismissed or confirmed, or the current reasoning while investigating. Markdown.',
          },
        },
        required: ['candidate', 'confidence', 'status'],
      },
    },
  },
  required: ['summary', 'hypotheses'],
} as const;
