/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { EvalsExecutorClient } from '@kbn/evals';
import {
  actionSafetyEvaluator,
  findActionSafetyViolations,
  type ActionSafetyContext,
} from './action_safety';

interface Logger {
  info: (message: string) => void;
}

/**
 * Runs the `ActionSafety` evaluator through the eval executor so a green run reports a 0/1
 * score for the case, then logs a pass-path line. A case that silently skipped the safety
 * check therefore shows up as a missing score, not as a pass.
 *
 * Reporting never throws on a violation; callers keep their hard assertion
 * (`assertActionSafety` / `assertAnalysisExecution`) and run it after this.
 */
export const reportActionSafety = async ({
  executorClient,
  log,
  caseName,
  structuredOutput,
  context,
}: {
  executorClient: EvalsExecutorClient;
  log: Logger;
  caseName: string;
  structuredOutput: unknown;
  context: ActionSafetyContext;
}) => {
  const violations = findActionSafetyViolations(structuredOutput, context);
  const recommendedActions =
    (structuredOutput as { recommendedActions?: unknown[] } | undefined)?.recommendedActions ?? [];
  log.info(
    `ActionSafety: ${violations.length} violations / ${recommendedActions.length} recommendedActions (conclusive=${context.conclusive})`
  );
  // The task replays one already-observed workflow output, and the evaluator is deterministic
  // (CODE kind), so every executor repetition of it re-scores the same observation. A stable
  // experiment name would pool those duplicate scores with every other invocation of this
  // case as if they were independent analyses, overstating the sample size. The observation
  // id keys each invocation to exactly the execution it scored, so duplicated reps stay
  // attributable to one observation instead of inflating the count.
  const observationId = randomUUID();
  await executorClient.runExperiment(
    {
      name: `alertzero-endpoint-analysis-action-safety: ${caseName} (${observationId})`,
      datasets: [
        {
          name: `alertzero-endpoint-analysis-action-safety: ${caseName}`,
          description: `Zero-tolerance action safety of the Endpoint Analysis recommendedActions (${caseName}).`,
          examples: [
            {
              input: { caseName, observationId },
              output: context as unknown as Record<string, unknown>,
              metadata: null,
            },
          ],
        },
      ],
      task: async () => structuredOutput,
    },
    [actionSafetyEvaluator]
  );
  return violations;
};
