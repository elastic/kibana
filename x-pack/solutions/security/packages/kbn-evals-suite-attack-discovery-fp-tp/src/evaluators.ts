/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import {
  FP_TP_VERDICTS,
  RATIONALE_MARKDOWN_MAX_LENGTH,
  SUMMARY_MARKDOWN_MAX_LENGTH,
  type FpTpOutcome,
} from './constants';
import type { FpTpTaskOutput } from './workflow_task';

interface ExpectedOutcome {
  outcome: FpTpOutcome;
}

const asOutput = (output: unknown): FpTpTaskOutput => output as FpTpTaskOutput;
const expectedOutcome = (expected: unknown): FpTpOutcome | undefined =>
  (expected as ExpectedOutcome | undefined)?.outcome;

/**
 * Primary metric: does the run's outcome match the gold outcome? A `failed` gold also
 * needs an explicit FAILED execution, so a timeout or cancellation cannot stand in for
 * the required-source guard. The label is the predicted outcome, so the report reads
 * as a confusion matrix.
 */
export const outcomeAccuracy: Evaluator = {
  name: 'OutcomeAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { outcome: predicted, executionStatus } = asOutput(output);
    const gold = expectedOutcome(expected);
    const matches =
      predicted !== undefined &&
      predicted === gold &&
      (gold !== 'failed' || executionStatus === ExecutionStatus.FAILED);
    return {
      score: matches ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${gold ?? 'none'}"`,
      metadata: {
        predicted: predicted ?? null,
        expected: gold ?? null,
        executionStatus,
      },
    };
  },
};

/**
 * The costly error: `false_positive` closes the attack, so predicting it when the gold
 * is anything else scores 0.
 */
export const unsafeClose: Evaluator = {
  name: 'UnsafeClose',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = asOutput(output).outcome;
    const gold = expectedOutcome(expected);
    const unsafe = predicted === 'false_positive' && gold !== 'false_positive';
    return {
      score: unsafe ? 0 : 1,
      label: unsafe ? 'unsafe_close' : 'safe',
      explanation: `predicted="${predicted ?? 'none'}" expected="${gold ?? 'none'}"`,
    };
  },
};

const payloadProblems = (output: FpTpTaskOutput, attackDiscoveryId: string): string[] => {
  const { payload, attackDiscoveryIdEcho } = output;
  if (!payload) {
    return ['no payload'];
  }
  const problems: string[] = [];
  if (output.executionStatus !== ExecutionStatus.COMPLETED) {
    problems.push(`execution ended ${output.executionStatus}, not completed`);
  }
  if (!FP_TP_VERDICTS.some((verdict) => verdict === payload.verdict)) {
    problems.push(`unsupported verdict "${payload.verdict}"`);
  }
  const summary = payload.summary_markdown ?? '';
  if (summary.trim() === '') {
    problems.push('empty summary_markdown');
  }
  if (summary.length > SUMMARY_MARKDOWN_MAX_LENGTH) {
    problems.push(`summary_markdown longer than ${SUMMARY_MARKDOWN_MAX_LENGTH}`);
  }
  if ((payload.rationale_markdown?.length ?? 0) > RATIONALE_MARKDOWN_MAX_LENGTH) {
    problems.push(`rationale_markdown longer than ${RATIONALE_MARKDOWN_MAX_LENGTH}`);
  }
  if (attackDiscoveryIdEcho !== attackDiscoveryId) {
    problems.push(`attack_discovery_id "${attackDiscoveryIdEcho}" does not echo the input`);
  }
  return problems;
};

const failureProblems = (output: FpTpTaskOutput): string[] => [
  ...(output.executionStatus !== ExecutionStatus.FAILED
    ? [`execution ended ${output.executionStatus}, not failed`]
    : []),
  ...(output.payload ? ['payload produced by a run that should have failed'] : []),
];

/**
 * Contract conformance. A run whose gold is `failed` must end FAILED (not timed out or
 * cancelled) and produce no payload;
 * any other run must produce a payload that satisfies the output contract.
 */
export const payloadConformance: Evaluator = {
  name: 'PayloadConformance',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const task = asOutput(output);
    const problems =
      expectedOutcome(expected) === 'failed'
        ? failureProblems(task)
        : payloadProblems(task, task.seededIds.attackDiscoveryId);
    return {
      score: problems.length === 0 ? 1 : 0,
      label: problems.length === 0 ? 'conforms' : 'violates',
      explanation: problems.length === 0 ? null : problems.join('; '),
    };
  },
};

/**
 * Zero-tool guardrail: the workflow gathers the evidence and the agent is tool-less, so
 * any tool call fails. N/A when the traces are unavailable.
 */
export const createFpTpTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) => asOutput(output).toolCallIds ?? [],
    goldenPathExtractor: () => [],
    orderWeight: 1,
    coverageWeight: 0,
  });

  return {
    ...inner,
    name: 'trajectory',
    evaluate: async (args) => {
      if (asOutput(args.output).toolCallsUnavailable) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Workflow trace unavailable — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};

/** Reports N/A for failed runs, which have no summary or rationale to judge. */
export const skipFailedRuns = (evaluator: Evaluator): Evaluator => ({
  ...evaluator,
  evaluate: async (args) => {
    if (asOutput(args.output).outcome === 'failed') {
      return {
        score: null,
        label: 'N/A',
        explanation: 'The run failed, so there is no summary or rationale to judge.',
      };
    }
    return evaluator.evaluate(args);
  },
});
