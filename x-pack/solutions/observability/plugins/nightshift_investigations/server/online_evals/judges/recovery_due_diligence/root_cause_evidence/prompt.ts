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

export const RECOVERY_ROOT_CAUSE_TOOL_NAME = 'score_recovery_root_cause_evidence';

const SYSTEM_PROMPT = `You judge whether an alert-recovery round actually explained the incident, using only what its tool calls returned. You get one round: the recovery request, each tool call with its arguments and result, and the agent's final answer.

Score two things, each 0, 0.5 or 1:
- mechanism_evidenced: does the answer name a specific mechanism for the alert-driving failure (what is failing and why), and do tool results support it directly? 1 = the mechanism is named and a result shows it at the request or log level, such as an error text tied to the failing requests. 0.5 = a plausible mechanism supported only by correlation, aggregates or one indirect result. 0 = unknown, or asserted without a result behind it.
- closure_evidenced: does the answer say why the alerting system closed the alert (what changed for the rule, not only that the symptom persisted), and do tool results support it? Same scale.

Facts stated in the recovery request itself, such as the alert's identifiers and its start and recovery times, are supported: restating them is not a claim to evidence.

Also report unsupported_claim: true when the answer states a cause, a number or a time it presents as found that no tool result contains.

"Unknown" is an honest answer and scores 0 on that item, but is not an unsupported claim.`;

export interface RecoveryRootCauseOutput {
  mechanism_claim: string;
  mechanism_evidenced: number;
  closure_claim: string;
  closure_evidenced: number;
  unsupported_claim: boolean;
  reasoning: string;
}

const halfStepSchema = lazySchema(() =>
  z
    .number()
    .min(0)
    .max(1)
    .transform((value) => Math.round(value * 2) / 2)
);

export const recoveryRootCauseOutputSchema = lazySchema(() =>
  z.object({
    mechanism_claim: z.string().max(MAX_JUDGE_TEXT_LENGTH).default(''),
    mechanism_evidenced: halfStepSchema,
    closure_claim: z.string().max(MAX_JUDGE_TEXT_LENGTH).default(''),
    closure_evidenced: halfStepSchema,
    unsupported_claim: z.boolean(),
    reasoning: z.string().max(MAX_JUDGE_TEXT_LENGTH),
  })
);

export const recoveryRootCausePrompt = createPrompt({
  name: 'nightshift_recovery_root_cause_evidence',
  description: 'Scores whether a recovery round evidenced the failure mechanism and the closure.',
  input: lazySchema(() => z.object({ transcript: z.string() })),
})
  .version({
    system: { mustache: { template: withIdentifierRule(SYSTEM_PROMPT) } },
    template: { mustache: { template: 'Recovery round:\n{{{transcript}}}' } },
    tools: {
      [RECOVERY_ROOT_CAUSE_TOOL_NAME]: {
        description: 'Return the two evidence scores, the claims they judge and the reasoning.',
        schema: {
          type: 'object',
          properties: {
            mechanism_claim: {
              type: 'string',
              description: 'The mechanism the answer names, paraphrased, or "none".',
            },
            mechanism_evidenced: { type: 'number', description: '0, 0.5 or 1.' },
            closure_claim: {
              type: 'string',
              description: 'Why the alert closed, paraphrased, or "none".',
            },
            closure_evidenced: { type: 'number', description: '0, 0.5 or 1.' },
            unsupported_claim: { type: 'boolean' },
            reasoning: { type: 'string', description: 'One-to-two sentence justification.' },
          },
          required: [
            'mechanism_claim',
            'mechanism_evidenced',
            'closure_claim',
            'closure_evidenced',
            'unsupported_claim',
            'reasoning',
          ],
        },
      },
    },
  } as const)
  .get();
