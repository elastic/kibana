/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowTiming } from './workflow_task';

/** Seconds between two ISO timestamps, or null when either is missing, unparsable or reversed. */
export const secondsBetween = (start?: string, end?: string): number | null => {
  if (!start || !end) {
    return null;
  }
  const seconds = (Date.parse(end) - Date.parse(start)) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
};

const createLatencyEvaluator = (
  name: string,
  describe: string,
  span: (timing: WorkflowTiming) => [string | undefined, string | undefined]
): Evaluator => ({
  name,
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output }) => {
    const { timing, executionStatus } = (output ?? {}) as {
      timing?: WorkflowTiming;
      executionStatus?: string;
    };
    // A run that failed, was cancelled or never finished stops early and would look fast on a
    // minimize score, so only completed runs are measured.
    if (executionStatus !== ExecutionStatus.COMPLETED) {
      return {
        score: null,
        label: 'unavailable',
        explanation: `${describe}: run not completed (status=${executionStatus ?? 'unknown'})`,
      };
    }
    const score = timing ? secondsBetween(...span(timing)) : null;
    // A missing timestamp is "not measured", never 0 seconds, which would read as the fastest run.
    return score === null
      ? { score, label: 'unavailable', explanation: `${describe}: timestamps not reported` }
      : { score, explanation: `${describe}: ${score.toFixed(1)}s` };
  },
});

/**
 * Engine execution time, from the engine's own timestamps (excludes Task Manager queueing before
 * the execution starts).
 */
export const workflowLatencySeconds = createLatencyEvaluator(
  'WorkflowLatencySeconds',
  'workflow execution',
  ({ startedAt, finishedAt }) => [startedAt, finishedAt]
);

/** The `ai.agent` / `ai.prompt` step alone, so model time can be told apart from enrichment. */
export const classificationStepLatencySeconds = createLatencyEvaluator(
  'ClassificationStepLatencySeconds',
  'classification step',
  ({ classificationStartedAt, classificationFinishedAt }) => [
    classificationStartedAt,
    classificationFinishedAt,
  ]
);

export const latencyEvaluators: Evaluator[] = [
  workflowLatencySeconds,
  classificationStepLatencySeconds,
];
