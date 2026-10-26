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

/**
 * What the model may return. Sizes are not enforced here or in {@link FINDINGS_JSON_SCHEMA}: the
 * inference layer rejects a whole call when one string is over its limit, and the model writes
 * close to the limits it is told, so a hard limit throws away good records. {@link limitFindings}
 * trims to the sizes the stores accept instead.
 */
export const findingsOutputSchema = lazySchema(() => {
  const hypothesisSchema = z.object({
    candidate: z.string().min(1),
    confidence: z.number(),
    status: z.enum(HYPOTHESIS_STATUSES),
    reason: z.string().optional(),
  });

  return z.object({
    summary: z.string().min(1),
    verdict: z.string().optional(),
    severity: z.enum(FINDINGS_SEVERITIES).optional(),
    impact_summary: z.string().min(1).optional(),
    impact_entities: z
      .array(
        z.object({
          name: z.string().min(1),
          type: z.string().min(1).optional(),
        })
      )
      .optional(),
    hypotheses: z.array(hypothesisSchema),
  });
});

export type FindingsOutput = z.infer<typeof findingsOutputSchema>;

const truncate = (text: string, max: number): string =>
  text.length > max ? text.slice(0, max) : text;

/** Trims a parsed record to the sizes the metadata, hypotheses and impact stores accept. */
export const limitFindings = (output: FindingsOutput): FindingsOutput => ({
  ...output,
  summary: truncate(output.summary, MAX_METADATA_TEXT_LENGTH),
  ...(output.verdict !== undefined
    ? { verdict: truncate(output.verdict, MAX_METADATA_TEXT_LENGTH) }
    : {}),
  ...(output.impact_summary !== undefined
    ? { impact_summary: truncate(output.impact_summary, MAX_EVIDENCE_TEXT_LENGTH) }
    : {}),
  ...(output.impact_entities !== undefined
    ? {
        impact_entities: output.impact_entities
          .slice(0, MAX_IMPACT_TOOL_ENTITIES)
          .map(({ name, type }) => ({
            name: truncate(name, MAX_ENTITY_NAME_LENGTH),
            ...(type !== undefined ? { type: truncate(type, MAX_ENTITY_ID_LENGTH) } : {}),
          })),
      }
    : {}),
  hypotheses: output.hypotheses.slice(0, MAX_HYPOTHESES).map((hypothesis) => ({
    ...hypothesis,
    candidate: truncate(hypothesis.candidate, MAX_EVIDENCE_TEXT_LENGTH),
    confidence: Math.min(1, Math.max(0, hypothesis.confidence)),
    ...(hypothesis.reason !== undefined
      ? { reason: truncate(hypothesis.reason, MAX_EVIDENCE_TEXT_LENGTH) }
      : {}),
  })),
});

/** The same shape as {@link findingsOutputSchema}, for the inference client. */
export const FINDINGS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'What happened, as far as the evidence shows: what deviated, when and where, and the current leading explanation. Two to four plain sentences, under 800 characters.',
    },
    verdict: {
      type: 'string',
      description:
        'Only when the agent has given its final answer: the conclusion in one or two sentences, with the root cause and the mechanism. Omit while the investigation is still running. Under 600 characters.',
    },
    severity: {
      type: 'string',
      enum: FINDINGS_SEVERITIES,
      description: 'Severity of the situation investigated, decided from what was confirmed.',
    },
    impact_summary: {
      type: 'string',
      description:
        'The business consequence in one or two plain sentences: who or what was affected, how badly, for how long, how broadly, with measured numbers. Omit when the evidence shows no impact yet. Under 500 characters.',
    },
    impact_entities: {
      type: 'array',
      description:
        'Only when two or more services or components were affected in different ways, grouped at service level. Never a service that was ruled out, found healthy or only suspected, and each one is named in impact_summary. At most 5.',
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
      description:
        'Every candidate cause considered so far, each with its own confidence and status. A snapshot: it replaces the stored list. At most 8.',
      items: {
        type: 'object',
        properties: {
          candidate: { type: 'string', description: 'The candidate cause, stated concretely.' },
          confidence: { type: 'number', description: 'From 0 to 1.' },
          status: { type: 'string', enum: HYPOTHESIS_STATUSES },
          reason: {
            type: 'string',
            description:
              'Why it was dismissed or confirmed, or the current reasoning while investigating. Markdown, under 300 characters.',
          },
        },
        required: ['candidate', 'confidence', 'status'],
      },
    },
  },
  required: ['summary', 'hypotheses'],
} as const;
