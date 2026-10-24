/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { AttackDiscoveryRubricPrompt } from './attack_discovery_rubric_prompt';

/** Label on a rubric score the judge could not produce. The score is `null`, never 0. */
export const UNSCORED_LABEL = 'unscored';
/** Label on a cell the rubric cannot measure because the example carries no expected discoveries. */
export const NO_REFERENCE_LABEL = 'N/A';
const DEFAULT_MAX_JUDGE_RETRIES = 2;

export const createAttackDiscoveryRubricEvaluator = ({
  inferenceClient,
  log,
  maxJudgeRetries = DEFAULT_MAX_JUDGE_RETRIES,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  maxJudgeRetries?: number;
}): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => {
  return {
    name: 'AttackDiscoveryRubric',
    kind: 'LLM',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const errors = (output as AttackDiscoveryTaskOutput | undefined)?.errors;
      if (errors && errors.length > 0) {
        return {
          score: 0,
          label: 'task_error',
          explanation: String(errors[0]).slice(0, 1000),
        };
      }

      const insights = (output as AttackDiscoveryTaskOutput | undefined)?.insights ?? null;
      if (!insights) {
        return {
          score: 0,
          label: 'missing_insights',
          explanation: 'Attack Discovery task did not produce insights.',
        };
      }

      const submission = JSON.stringify(
        {
          attackDiscoveries: insights,
        },
        null,
        2
      );

      // An absent annotation is not the same thing as "no discoveries were expected". Resolved
      // examples can carry criteria but no expected output at all (example 7a17407b of the
      // attack-discovery dataset in run bk-01a14b73). Defaulting the reference to `[]` made the
      // judge grade every real submission against a fabricated empty reference: three models
      // producing on-topic kill-chain discoveries scored 0/N, while an all-empty insight stub
      // scored 1/Y ("PASS (vacuously - no content to compare)"). Report the cell as unmeasured
      // instead — the same convention `createAttackDiscoveryCriteriaEvaluator` uses when its
      // annotation is absent — and keep an explicitly stored empty array as the meaningful
      // "no discoveries were expected" golden, which is still graded.
      const expectedDiscoveries = expected?.attackDiscoveries;
      if (!Array.isArray(expectedDiscoveries)) {
        return {
          score: null,
          label: NO_REFERENCE_LABEL,
          explanation:
            'The example carries no expected attack discoveries, so the rubric is not applicable.',
        };
      }

      const reference = JSON.stringify(
        {
          attackDiscoveries: expectedDiscoveries,
        },
        null,
        2
      );

      // Every failure here is the judge's, never the candidate's: the task already finished.
      // Retry the transient ones a bounded number of times, then record the cell as unscored
      // instead of throwing (a throw out of an evaluator fails the whole spec).
      const failures: string[] = [];
      for (let attempt = 0; attempt <= maxJudgeRetries; attempt++) {
        try {
          const args = await gradeOnce({ inferenceClient, submission, reference });
          if (args) {
            return {
              score: args.verdict === 'Y' ? 1 : 0,
              label: args.verdict,
              explanation: args.explanation,
              ...(attempt > 0 && { metadata: { judgeAttempts: attempt + 1 } }),
            };
          }
          failures.push('Missing grade tool call');
        } catch (error) {
          if (!isRetryableJudgeError(error)) {
            throw error;
          }
          failures.push(describeError(error));
        }
        log.warning(
          `AttackDiscoveryRubric judge attempt ${attempt + 1}/${maxJudgeRetries + 1} failed: ${
            failures[failures.length - 1]
          }`
        );
      }

      return {
        score: null,
        label: UNSCORED_LABEL,
        explanation: `Rubric judge failed after ${failures.length} attempt(s): ${failures.join(
          '; '
        )}`.slice(0, 1000),
        metadata: { judgeAttempts: failures.length, judgeFailures: failures },
      };
    },
  };
};

const gradeOnce = async ({
  inferenceClient,
  submission,
  reference,
}: {
  inferenceClient: BoundInferenceClient;
  submission: string;
  reference: string;
}): Promise<{ verdict: 'Y' | 'N'; explanation: string } | undefined> => {
  const response = await executeUntilValid({
    prompt: AttackDiscoveryRubricPrompt,
    inferenceClient,
    input: {
      submission,
      reference,
    },
    finalToolChoice: {
      function: 'grade',
    } as ToolChoice<'grade'>,
    maxRetries: 3,
    toolCallbacks: {
      grade: async (toolCall) => ({
        response: toolCall.function.arguments,
      }),
    },
  });

  return response.toolCalls[0]?.function.arguments as
    | { verdict: 'Y' | 'N'; explanation: string }
    | undefined;
};

const getStatus = (error: unknown): number | undefined => {
  const e = error as { status?: unknown; statusCode?: unknown; cause?: unknown } | undefined;
  const status = e?.status ?? e?.statusCode;
  if (typeof status === 'number') {
    return status;
  }
  return e?.cause && e.cause !== error ? getStatus(e.cause) : undefined;
};

const describeError = (error: unknown): string => {
  const status = getStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  return `${status !== undefined ? `HTTP ${status}: ` : ''}${message}`.slice(0, 300);
};

/**
 * A judge call can hit Kibana's 300s inference stream cap (408) or a transient upstream error.
 * Request and auth errors are not retried: they fail the same way every time.
 */
const isRetryableJudgeError = (error: unknown): boolean => {
  const status = getStatus(error);
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /exceeded the maximum allowed duration/i.test(message);
};
