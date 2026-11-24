/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_JUDGE_TEXT_LENGTH } from '../../alert_outcome_shared';
import { withIdentifierRule } from '../../with_identifier_rule';
import { CAUSAL_STRATEGY_IDS } from '../strategies';
import systemPromptText from './system_prompt.text';

export const RECOVERY_CHECKLIST_TOOL_NAME = 'score_recovery_checklist';

export const STRATEGY_STATUSES = ['ran', 'blocked', 'not_run'] as const;

export interface RecoveryChecklistOutput {
  strategies: Array<{
    id: string;
    status: (typeof STRATEGY_STATUSES)[number];
    step: number;
    note: string;
  }>;
  summary: string;
}

export const recoveryChecklistOutputSchema = lazySchema(() =>
  z.object({
    strategies: z.array(
      z.object({
        id: z.string().max(64),
        status: z.enum(STRATEGY_STATUSES),
        step: z.number().int().min(0).max(100_000).default(0),
        note: z.string().max(MAX_JUDGE_TEXT_LENGTH).default(''),
      })
    ),
    summary: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export const recoveryChecklistPrompt = createPrompt({
  name: 'nightshift_recovery_causal_checklist',
  description: 'Audits which causal-analysis strategies a recovery round actually ran.',
  input: lazySchema(() =>
    z.object({
      strategy_list: z.string(),
      earlier_answers: z.string().max(MAX_JUDGE_TEXT_LENGTH),
      transcript: z.string(),
    })
  ),
})
  .version({
    system: { mustache: { template: withIdentifierRule(systemPromptText) } },
    template: {
      mustache: {
        template:
          'Answers of the earlier rounds (the hypotheses to revisit):\n{{{earlier_answers}}}\n\nRecovery round:\n{{{transcript}}}',
      },
    },
    tools: {
      [RECOVERY_CHECKLIST_TOOL_NAME]: {
        description: 'Return the status of every strategy and a one-sentence summary.',
        schema: {
          type: 'object',
          properties: {
            strategies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', enum: [...CAUSAL_STRATEGY_IDS] },
                  status: { type: 'string', enum: [...STRATEGY_STATUSES] },
                  step: {
                    type: 'number',
                    description: 'The 1-based tool call that ran or tried it; 0 if none.',
                  },
                  note: { type: 'string', description: 'At most one sentence of evidence.' },
                },
                required: ['id', 'status', 'step', 'note'],
              },
            },
            summary: {
              type: 'string',
              description: 'One sentence on what was and was not covered.',
            },
          },
          required: ['strategies', 'summary'],
        },
      },
    },
  } as const)
  .get();
