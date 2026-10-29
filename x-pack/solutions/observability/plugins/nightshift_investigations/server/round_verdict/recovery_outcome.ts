/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';

export const RECORD_RECOVERY_OUTCOME_TOOL_ID = 'nightshift_record_recovery_outcome';

export const RECOVERY_VERDICTS = [
  'confirmed',
  'partly_supported',
  'contradicted',
  'unresolved',
] as const;

export const RECOVERY_RESOLVERS = [
  'fix_or_rollback',
  'self_resolved',
  'load_change',
  'suppressed',
  'unknown',
] as const;

export const RECOVERY_HYPOTHESIS_OUTCOMES = ['supported', 'contradicted', 'not_tested'] as const;

const MAX_TEXT_LENGTH = 2048;
const MAX_HYPOTHESES = 50;

export const recoveryOutcomeSchema = z.object({
  verdict: z
    .enum(RECOVERY_VERDICTS)
    .describe('How the recovery bears on the root cause reported before this round.'),
  resolved_by: z.enum(RECOVERY_RESOLVERS).describe('What made the alert recover.'),
  resolution: z
    .string()
    .min(1)
    .max(MAX_TEXT_LENGTH)
    .describe('One sentence naming what resolved the alert, with the evidence.'),
  hypotheses: z
    .array(
      z.object({
        candidate: z
          .string()
          .min(1)
          .max(MAX_TEXT_LENGTH)
          .describe('The hypothesis, in the same words as in set_hypotheses.'),
        outcome: z
          .enum(RECOVERY_HYPOTHESIS_OUTCOMES)
          .describe('Whether the recovery supported, contradicted, or did not test it.'),
      })
    )
    .max(MAX_HYPOTHESES)
    .describe('One entry per hypothesis that existed before this round.'),
});

export type RecoveryOutcome = z.infer<typeof recoveryOutcomeSchema>;

/**
 * The verdict a recovery round recorded. The last valid call wins, so the agent can correct
 * itself; nothing guarantees it makes the call at all.
 */
export const findRecoveryOutcome = (
  toolCalls: readonly InvestigationToolCall[]
): RecoveryOutcome | undefined => {
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const call = toolCalls[i];
    if (call.tool_id !== RECORD_RECOVERY_OUTCOME_TOOL_ID) {
      continue;
    }
    const parsed = recoveryOutcomeSchema.safeParse(call.params);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return undefined;
};
