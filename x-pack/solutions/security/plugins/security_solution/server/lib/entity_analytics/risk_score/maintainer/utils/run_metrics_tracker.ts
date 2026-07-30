/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepResult } from '../steps/pipeline_types';

export interface RunMetrics {
  scoresWrittenBase: number;
  scoresWrittenResolution: number;
  scoresWrittenResetToZero: number;
  pagesProcessed: number;
  lookupPrunedDocs: number;
  /** Entities created by the create-if-missing path during base scoring. */
  entitiesCreated: number;
  /** not_in_store scores dropped by the create-if-missing path during base scoring. */
  entitiesCreateRejected: number;
}

const METRIC_KEYS: ReadonlyArray<keyof RunMetrics> = [
  'scoresWrittenBase',
  'scoresWrittenResolution',
  'scoresWrittenResetToZero',
  'pagesProcessed',
  'lookupPrunedDocs',
  'entitiesCreated',
  'entitiesCreateRejected',
];

const emptyMetrics = (): RunMetrics => ({
  scoresWrittenBase: 0,
  scoresWrittenResolution: 0,
  scoresWrittenResetToZero: 0,
  pagesProcessed: 0,
  lookupPrunedDocs: 0,
  entitiesCreated: 0,
  entitiesCreateRejected: 0,
});

const scoresWrittenTotal = (metrics: RunMetrics): number =>
  metrics.scoresWrittenBase + metrics.scoresWrittenResolution + metrics.scoresWrittenResetToZero;

interface SummaryContext {
  namespace: string;
  idBasedRiskScoringEnabled: boolean;
}

interface RunSummaryContext extends SummaryContext {
  entityType: string;
  status: string;
  errorKind?: string;
  durationMs: number;
}

interface AggregateSummaryContext extends SummaryContext {
  durationMs: number;
  entityTypesProcessed: number;
}

export const createRunMetricsTracker = () => {
  const aggregate: RunMetrics = emptyMetrics();

  return {
    newRun: (): RunMetrics => emptyMetrics(),

    recordBase: (
      target: RunMetrics,
      summary: {
        scoresWritten: number;
        pagesProcessed: number;
        entitiesCreated: number;
        entitiesCreateRejected: number;
      }
    ) => {
      target.scoresWrittenBase = summary.scoresWritten;
      target.pagesProcessed = summary.pagesProcessed;
      target.entitiesCreated = summary.entitiesCreated;
      target.entitiesCreateRejected = summary.entitiesCreateRejected;
    },

    recordResolution: (target: RunMetrics, result: StepResult) => {
      target.scoresWrittenResolution = result.scoresWritten;
    },

    recordResetToZero: (target: RunMetrics, result: StepResult) => {
      target.scoresWrittenResetToZero = result.scoresWritten;
    },

    recordPrune: (target: RunMetrics, prunedDocs: number) => {
      target.lookupPrunedDocs = prunedDocs;
    },

    accumulate: (run: Readonly<RunMetrics>) => {
      for (const key of METRIC_KEYS) {
        aggregate[key] += run[key];
      }
    },

    toRunSummary: (runMetrics: RunMetrics, context: RunSummaryContext) => ({
      ...context,
      scoresWrittenTotal: scoresWrittenTotal(runMetrics),
      ...runMetrics,
    }),

    toAggregateSummary: (context: AggregateSummaryContext) => ({
      ...context,
      scoresWrittenTotal: scoresWrittenTotal(aggregate),
      ...aggregate,
    }),
  };
};
