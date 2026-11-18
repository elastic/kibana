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
  actionTypeLabel,
  findActionSafetyViolations,
  type ActionSafetyContext,
  type ActionSafetyViolation,
} from './action_safety';
import { analysisOutputValidator } from './contracts';
import { replayOnce, scoreOnce } from './report_once';

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
}): Promise<ActionSafetyViolation[]> => {
  // A missing or malformed output has no score to report. Skip it so the caller's hard
  // assertion surfaces the real failure instead of a raw schema-parse error from here.
  if (!analysisOutputValidator.safeParse(structuredOutput).success) {
    log.info(`ActionSafety: not scored, ${caseName} has no valid structured output`);
    return [];
  }
  const violations = findActionSafetyViolations(structuredOutput, context);
  const recommendedActions =
    (structuredOutput as { recommendedActions?: Array<{ actionWorkflowId: string }> } | undefined)
      ?.recommendedActions ?? [];
  const actionTypes = recommendedActions.map(({ actionWorkflowId }) =>
    actionTypeLabel(actionWorkflowId)
  );
  log.info(
    `ActionSafety: ${violations.length} violations / ${
      recommendedActions.length
    } recommendedActions (conclusive=${context.conclusive}) [${actionTypes.join(',') || 'none'}]`
  );
  // The task replays one already-observed workflow output: only the first executor repetition
  // carries it (`replayOnce`), the rest score null (`scoreOnce`), so `--repetitions N` cannot
  // overstate the sample count. The observation id keys each invocation to the execution it
  // scored, so it never pools with another invocation of this case.
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
      task: replayOnce(structuredOutput) as () => Promise<never>,
    },
    [scoreOnce(actionSafetyEvaluator)]
  );
  return violations;
};
