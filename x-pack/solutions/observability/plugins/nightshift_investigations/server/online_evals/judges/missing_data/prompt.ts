/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { withIdentifierRule } from '../with_identifier_rule';
import systemPromptText from './system_prompt.text';

export const MISSING_DATA_TOOL_NAME = 'report_missing_data';

/** Why a piece of data is missing: each is something someone must fix. */
export const MISSING_DATA_REASONS = ['no_access', 'not_retained', 'not_collected'] as const;

export type MissingDataReason = (typeof MISSING_DATA_REASONS)[number];

/** Gaps a round may report. */
export const MAX_MISSING_DATA = 3;

export const MISSING_DATA_SYSTEM_PROMPT: string = withIdentifierRule(systemPromptText);

/**
 * Sizes are not enforced here: the inference layer rejects a whole call when one string is over its
 * limit, and a good report is worth more than a strict one. The judge trims to the sizes it sends.
 */
export const missingDataOutputSchema = lazySchema(() =>
  z.object({
    gaps: z.array(
      z.object({
        what: z.string(),
        source: z.string().optional(),
        why: z.enum(MISSING_DATA_REASONS),
        would_decide: z.string().optional(),
      })
    ),
  })
);

export type MissingDataOutput = z.infer<typeof missingDataOutputSchema>;

export const missingDataTool: { name: string; description: string; schema: ToolSchema } = {
  name: MISSING_DATA_TOOL_NAME,
  description: 'Report the data the investigation was missing.',
  schema: {
    type: 'object',
    properties: {
      gaps: {
        type: 'array',
        description: `At most ${MAX_MISSING_DATA} gaps, the most decisive first. Empty when the answer states a verified cause, there was nothing to explain, or no data was out of reach.`,
        items: {
          type: 'object',
          properties: {
            what: { type: 'string', description: 'A few words naming the data.' },
            source: { type: 'string', description: 'Where the data would come from.' },
            why: {
              type: 'string',
              enum: [...MISSING_DATA_REASONS],
              description:
                'no_access: permission, authentication or connector error. not_retained: gone, expired or empty for the window. not_collected: the source does not record it.',
            },
            would_decide: {
              type: 'string',
              description: 'At most 15 words: the question the data would settle.',
            },
          },
          required: ['what', 'why'],
        },
      },
    },
    required: ['gaps'],
  },
};

/** The human message that closes the conversation and asks for the report. */
export const buildScoringRequest = ({ omittedToolCalls }: { omittedToolCalls: number }): string =>
  [
    'The conversation above is the investigation to audit.',
    omittedToolCalls > 0
      ? `${omittedToolCalls} tool calls from the middle of the investigation were left out to fit your context.`
      : undefined,
    `Report the data it was missing by calling ${MISSING_DATA_TOOL_NAME}.`,
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n\n');
