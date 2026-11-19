/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { MAX_JUDGE_INPUT_CHARS } from '../../alert_outcome_shared';
import { renderRound, roundEvidenceSchema, truncate } from '../../render_round';
import { capExplanation, runJudge } from '../../run_judge';
import {
  CAUSAL_STRATEGIES,
  CAUSAL_STRATEGY_IDS,
  checklistScore,
  type StrategyStatus,
} from '../strategies';
import {
  RECOVERY_CHECKLIST_TOOL_NAME,
  recoveryChecklistOutputSchema,
  recoveryChecklistPrompt,
  type RecoveryChecklistOutput,
} from './prompt';

export const RECOVERY_CHECKLIST_SCORE = 'recovery_checklist';

/** Every strategy gets a status: one the judge left out was not run. */
export const toStrategyStatuses = (
  output: Pick<RecoveryChecklistOutput, 'strategies'>
): Record<string, StrategyStatus> => {
  const reported = new Map(output.strategies.map(({ id, status }) => [id, status]));
  return Object.fromEntries(
    CAUSAL_STRATEGY_IDS.map((id) => [id, reported.get(id) ?? ('not_run' as const)])
  );
};

/** One tag per strategy, `strategy:<id>:<status>`, so a dashboard can count which checks ran. */
export const strategyTags = (statuses: Record<string, StrategyStatus>): string[] =>
  CAUSAL_STRATEGIES.map(({ id }) => `strategy:${id}:${statuses[id]}`);

export const recoveryCausalChecklistJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_recovery_causal_checklist',
  version: '1.0.0',
  kind: 'llm',
  direction: 'maximize',
  description:
    'Reference-free: which of 17 causal-analysis strategies (alert record, rule execution record, before/during/after windows, earlier episodes, re-open check, deploys, restarts and others) an alert-recovery round actually ran, from its tool calls. Scores the recovery round itself, not the first round.',
  evidenceSchema: roundEvidenceSchema,
  async evaluate({ round, inferenceClient }) {
    if (!inferenceClient) {
      throw new Error(
        'Inference client is required for the nightshift_recovery_causal_checklist judge'
      );
    }
    const output = await runJudge({
      inferenceClient,
      prompt: recoveryChecklistPrompt,
      input: { transcript: truncate(renderRound(round), MAX_JUDGE_INPUT_CHARS) },
      toolName: RECOVERY_CHECKLIST_TOOL_NAME,
      outputSchema: recoveryChecklistOutputSchema,
    });
    const statuses = toStrategyStatuses(output);
    const count = (wanted: StrategyStatus) =>
      Object.values(statuses).filter((status) => status === wanted).length;
    const notRun = CAUSAL_STRATEGY_IDS.filter((id) => statuses[id] === 'not_run');

    return {
      scores: [
        {
          name: RECOVERY_CHECKLIST_SCORE,
          score: checklistScore(statuses),
          label: `${count('ran')} ran / ${count('blocked')} blocked / ${count('not_run')} not run`,
          explanation: capExplanation(`${output.summary} Not run: ${notRun.join(', ') || 'none'}.`),
          metadata: { tags: strategyTags(statuses) },
        },
      ],
    };
  },
};
