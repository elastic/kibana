/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_JUDGE_INPUT_CHARS } from '../../alert_outcome_shared';
import { renderRound, roundEvidenceSchema, truncate } from '../../render_round';
import { capExplanation, runJudge } from '../../run_judge';
import {
  CAUSAL_STRATEGIES,
  CAUSAL_STRATEGY_IDS,
  applyCitationRule,
  checklistScore,
  type StrategyStatus,
} from '../strategies';
import {
  RECOVERY_CHECKLIST_TOOL_NAME,
  recoveryChecklistOutputSchema,
  recoveryChecklistPrompt,
} from './prompt';

export const RECOVERY_CHECKLIST_SCORE = 'recovery_checklist';

/** The earlier rounds' answers the scored round is judged against, from the conversation. */
export const recoveryReferenceDataSchema = lazySchema(() =>
  z.object({ earlier_rounds: z.array(z.string()).optional() })
);

type RecoveryReferenceData = z.infer<typeof recoveryReferenceDataSchema>;

/** One tag per strategy, `strategy:<id>:<status>`, so a dashboard can count which checks ran. */
export const strategyTags = (statuses: Record<string, StrategyStatus>): string[] =>
  CAUSAL_STRATEGIES.map(({ id }) => `strategy:${id}:${statuses[id]}`);

const definition: RegisteredEvaluatorDefinition<RecoveryReferenceData> = {
  name: 'nightshift_recovery_causal_checklist',
  version: '1.1.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    "Reference-free: which of 17 causal-analysis strategies (alert record, rule execution record, before/during/after windows, earlier episodes, re-open check, deploys, restarts and others) an alert-recovery round actually ran, from its tool calls, and whether it revisited the earlier answer's hypotheses. Scores the recovery round itself, not the first round. A strategy only counts with a cited tool call.",
  evidenceSchema: roundEvidenceSchema,
  referenceDataSchema: recoveryReferenceDataSchema,
  async evaluate({ round, referenceData, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_recovery_causal_checklist judge'
      );
    }
    const earlierAnswers = referenceData?.earlier_rounds ?? [];
    const output = await runJudge({
      inferenceClient,
      prompt: recoveryChecklistPrompt,
      input: {
        earlier_answers: truncate(
          earlierAnswers.map((answer, index) => `Round ${index + 1}:\n${answer}`).join('\n\n') ||
            '(not available)',
          MAX_JUDGE_INPUT_CHARS
        ),
        transcript: renderRound(round),
      },
      toolName: RECOVERY_CHECKLIST_TOOL_NAME,
      outputSchema: recoveryChecklistOutputSchema,
    });
    const { statuses, uncited } = applyCitationRule(output.strategies, round.steps.length);
    const count = (wanted: StrategyStatus) =>
      Object.values(statuses).filter((status) => status === wanted).length;
    const notRun = CAUSAL_STRATEGY_IDS.filter((id) => statuses[id] === 'not_run');

    return {
      scores: [
        {
          name: RECOVERY_CHECKLIST_SCORE,
          score: checklistScore(statuses),
          label: `${count('ran')} ran / ${count('blocked')} blocked / ${count('not_run')} not run`,
          explanation: capExplanation(
            `${output.summary} Not run: ${notRun.join(', ') || 'none'}.${
              uncited.length > 0 ? ` Claimed without a cited tool call: ${uncited.join(', ')}.` : ''
            }`
          ),
          // The citation of each strategy is kept for audit; only the tags reach the event.
          metadata: {
            tags: strategyTags(statuses),
            strategies: output.strategies.map(({ id, status, step }) => ({ id, status, step })),
          },
        },
      ],
    };
  },
};

export const recoveryCausalChecklistJudge: RegisteredEvaluatorDefinition = definition;
