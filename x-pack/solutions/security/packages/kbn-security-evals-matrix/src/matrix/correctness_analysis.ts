/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { LlmCorrectnessEvaluationPrompt, type CorrectnessAnalysis } from '@kbn/evals';

interface CorrectnessAnalysisArgs {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  expected?: Record<string, unknown>;
}

export interface CorrectnessAnalysisResult {
  label: string;
  explanation: string;
  metadata: CorrectnessAnalysis;
}

/**
 * Runs the shared correctness judge prompt outside an eval run.
 *
 * `@kbn/evals` builds this evaluator inside `DefaultEvaluators`, which only
 * exists during a Playwright eval run. Judge replay has no such run, so it
 * rebuilds the same call from the package's public prompt export. Keep the
 * prompt inputs identical to the in-run evaluator or a replay stops being a
 * like-for-like re-grade.
 */
export const createCorrectnessAnalysis = ({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}) => {
  return async ({
    input,
    output,
    expected,
  }: CorrectnessAnalysisArgs): Promise<CorrectnessAnalysisResult> => {
    const messages = (output?.messages as Array<{ message?: unknown }> | undefined) ?? [];
    const latestMessage = messages[messages.length - 1]?.message;

    const runAnalysis = async (): Promise<CorrectnessAnalysis> => {
      const response = await inferenceClient.prompt({
        prompt: LlmCorrectnessEvaluationPrompt,
        input: {
          user_query: `${input?.question}`,
          agent_response: `${latestMessage}`,
          ground_truth_response: `${expected?.expected}`,
        },
        // `createPrompt` discards the prompt's own toolChoice, so it is set per call.
        toolChoice: { function: 'analyze' } as ToolChoice,
      });

      const toolCall = response.toolCalls[0];
      if (!toolCall) {
        throw new Error('No tool call found in LLM response');
      }
      return toolCall.function.arguments as CorrectnessAnalysis;
    };

    const analysis = await pRetry(runAnalysis, {
      retries: 3,
      onFailedAttempt: (error) => {
        log.warning(
          new Error(
            `Correctness analysis returned an invalid or missing tool call on attempt ${error.attemptNumber}; ${error.retriesLeft} retries left`,
            { cause: error }
          )
        );
      },
    });

    const { summary } = analysis;
    return {
      label: 'correctness-analysis',
      explanation: `Factuality: ${summary.factual_accuracy_summary}, Relevance: ${summary.relevance_summary}, Sequence: ${summary.sequence_accuracy_summary}`,
      metadata: analysis,
    };
  };
};
