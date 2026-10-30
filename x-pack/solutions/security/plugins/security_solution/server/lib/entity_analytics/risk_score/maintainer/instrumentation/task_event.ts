/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScorePerformanceEvent } from './events';

/** Retains the longest stage prefix that fits Task Manager's custom-event budget. */
export const buildRiskScoreTaskEvent = (
  calculationRunId: string,
  status: TaskEvent['status'],
  durationMs: number,
  stages: readonly StageSummary[]
): TaskEvent =>
  stages.reduce(appendStageWithinBudget, {
    calculationRunId,
    status,
    durationMs,
    stages: [],
    omittedStages: stages.length,
  });

const appendStageWithinBudget = (
  event: TaskEvent,
  stage: StageSummary,
  index: number
): TaskEvent => {
  if (event.stages.length < index) return event;
  const candidate = {
    ...event,
    stages: [...event.stages, stage],
    omittedStages: event.omittedStages - 1,
  };
  return Buffer.byteLength(JSON.stringify(candidate)) <= TASK_EVENT_BYTE_BUDGET ? candidate : event;
};

const TASK_EVENT_BYTE_BUDGET = 3500;

type StageSummary = Pick<
  RiskScorePerformanceEvent,
  'entityType' | 'stage' | 'status' | 'durationMs'
>;

interface TaskEvent extends Record<string, string | number | StageSummary[]> {
  calculationRunId: string;
  status: RiskScorePerformanceEvent['status'] | 'running';
  durationMs: number;
  stages: StageSummary[];
  omittedStages: number;
}
