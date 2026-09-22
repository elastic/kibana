/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepExecutionWithLink } from '../../../types';

const UNKNOWN_GROUP_KEY = '__unknown__';

export const STATUS_PRIORITY: Record<string, number> = {
  cancelled: 2,
  completed: -1,
  failed: 4,
  pending: 0,
  running: 1,
  timed_out: 3,
  waiting: 0,
  waiting_for_input: 0,
};

export interface PhaseGroup {
  durationMs: number | undefined;
  error: StepExecutionWithLink['error'] | undefined;
  key: string;
  pipelinePhase: string | undefined;
  steps: StepExecutionWithLink[];
  worstStatus: string;
  workflowId: string | undefined;
  workflowName: string | undefined;
}

/** Groups steps by workflowRunId, preserving insertion order. */
export const groupStepsByPhase = (steps: StepExecutionWithLink[]): PhaseGroup[] => {
  const groups = steps.reduce<Map<string, StepExecutionWithLink[]>>((acc, step) => {
    const key = step.workflowRunId ?? UNKNOWN_GROUP_KEY;
    const existing = acc.get(key) ?? [];
    return new Map(acc).set(key, [...existing, step]);
  }, new Map());

  return Array.from(groups.keys()).map((key) => {
    const groupSteps = groups.get(key) ?? [];
    const representative = groupSteps[0];

    let totalDuration = 0;
    let hasDuration = false;
    for (const s of groupSteps) {
      if (s.executionTimeMs != null) {
        totalDuration += s.executionTimeMs;
        hasDuration = true;
      }
    }

    let worstStatus = groupSteps[0]?.status ?? 'unknown';
    for (const s of groupSteps) {
      if ((STATUS_PRIORITY[s.status] ?? 0) > (STATUS_PRIORITY[worstStatus] ?? 0)) {
        worstStatus = s.status;
      }
    }

    const firstError = groupSteps.find((s) => s.error != null)?.error;

    return {
      durationMs: hasDuration ? totalDuration : undefined,
      error: firstError,
      key,
      pipelinePhase: representative?.pipelinePhase,
      steps: groupSteps,
      worstStatus,
      workflowId: representative?.workflowId,
      workflowName: representative?.workflowName,
    };
  });
};
