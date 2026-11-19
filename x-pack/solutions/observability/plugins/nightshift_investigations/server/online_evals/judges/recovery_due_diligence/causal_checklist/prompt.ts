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
import { CAUSAL_STRATEGIES, CAUSAL_STRATEGY_IDS } from '../strategies';

export const RECOVERY_CHECKLIST_TOOL_NAME = 'score_recovery_checklist';

export const STRATEGY_STATUSES = ['ran', 'blocked', 'not_run'] as const;

const strategyList = CAUSAL_STRATEGIES.map(
  ({ id, description, reportOnly }) =>
    `- ${id}${reportOnly ? ' (judge from the answer)' : ''}: ${description}`
).join('\n');

/** The system prompt; the strategies are the checklist the eval suite scores against too. */
export const CAUSAL_CHECKLIST_SYSTEM_PROMPT = `You audit how thoroughly an AI agent analysed an alert recovery. You get one round: the recovery request, each tool call the agent made with its arguments and result, and its final answer. Earlier rounds of the investigation are not shown, so only what this round did counts.

For every strategy below, decide its status:
- "ran": a tool call in this round executed it. Give the number of that tool call. An answer that says it did something, or says it will, does not count without a tool call that did it.
- "blocked": a tool call tried it against a source it could not read or that returned nothing usable (denied access, empty indices, a query error that was never worked around).
- "not_run": no tool call tried it.
Two strategies are judged from the final answer alone: "ran" when the answer does it explicitly, otherwise "not_run".

Be strict. A strategy that was only partly covered, such as one window instead of three, is "ran" only when what was done answers the strategy's question.

Strategies:
${strategyList}`;

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
  input: lazySchema(() => z.object({ transcript: z.string().max(MAX_JUDGE_TEXT_LENGTH) })),
})
  .version({
    system: { mustache: { template: withIdentifierRule(CAUSAL_CHECKLIST_SYSTEM_PROMPT) } },
    template: { mustache: { template: 'Recovery round:\n{{{transcript}}}' } },
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
