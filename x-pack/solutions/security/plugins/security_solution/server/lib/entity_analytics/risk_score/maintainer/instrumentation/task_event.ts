/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScorePerformanceEvent } from './events';

type StageSummary = Pick<
  RiskScorePerformanceEvent,
  'entityType' | 'stage' | 'status' | 'durationMs'
>;

/** Fits risk-score stage summaries within Task Manager's custom-event budget. */
export const buildRiskScoreTaskEvent = (
  calculationRunId: string,
  status: RiskScorePerformanceEvent['status'],
  durationMs: number,
  stages: readonly StageSummary[]
) => {
  const identity = { calculationRunId, status, durationMs };
  let included = stages.length;
  let event = { ...identity, stages: stages.slice(0, included), omittedStages: 0 };
  while (included > 0 && Buffer.byteLength(JSON.stringify(event)) > TASK_EVENT_BYTE_BUDGET) {
    included -= 1;
    event = {
      ...identity,
      stages: stages.slice(0, included),
      omittedStages: stages.length - included,
    };
  }
  return event;
};

const TASK_EVENT_BYTE_BUDGET = 3500;
