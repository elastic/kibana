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
  // Phase 1 scores calculated from alerts before the not_in_store filter
  scoresCalculatedBase: number;
  // Phase 1 scores for EUIDs absent from the entity store
  scoresDroppedNotInStore: number;
  scoresFailedBase: number;
  scoresFailedResolution: number;
  scoresFailedResetToZero: number;
  pagesProcessed: number;
  lookupPrunedDocs: number;
}

const METRIC_KEYS: ReadonlyArray<keyof RunMetrics> = [
  'scoresWrittenBase',
  'scoresWrittenResolution',
  'scoresWrittenResetToZero',
  'scoresCalculatedBase',
  'scoresDroppedNotInStore',
  'scoresFailedBase',
  'scoresFailedResolution',
  'scoresFailedResetToZero',
  'pagesProcessed',
  'lookupPrunedDocs',
];

const emptyMetrics = (): RunMetrics => ({
  scoresWrittenBase: 0,
  scoresWrittenResolution: 0,
  scoresWrittenResetToZero: 0,
  scoresCalculatedBase: 0,
  scoresDroppedNotInStore: 0,
  scoresFailedBase: 0,
  scoresFailedResolution: 0,
  scoresFailedResetToZero: 0,
  pagesProcessed: 0,
  lookupPrunedDocs: 0,
});

const scoresWrittenTotal = (metrics: RunMetrics): number =>
  metrics.scoresWrittenBase + metrics.scoresWrittenResolution + metrics.scoresWrittenResetToZero;

const scoresFailedTotal = (metrics: RunMetrics): number =>
  metrics.scoresFailedBase + metrics.scoresFailedResolution + metrics.scoresFailedResetToZero;

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
        scoresCalculated: number;
        scoresDroppedNotInStore: number;
        scoresFailed: number;
        pagesProcessed: number;
      }
    ) => {
      target.scoresWrittenBase = summary.scoresWritten;
      target.scoresCalculatedBase = summary.scoresCalculated;
      target.scoresDroppedNotInStore = summary.scoresDroppedNotInStore;
      target.scoresFailedBase = summary.scoresFailed;
      target.pagesProcessed = summary.pagesProcessed;
    },

    recordResolution: (target: RunMetrics, result: StepResult) => {
      target.scoresWrittenResolution = result.scoresWritten;
      target.scoresFailedResolution = result.scoresFailed;
    },

    recordResetToZero: (target: RunMetrics, result: StepResult) => {
      target.scoresWrittenResetToZero = result.scoresWritten;
      target.scoresFailedResetToZero = result.scoresFailed;
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
      scoresFailedTotal: scoresFailedTotal(runMetrics),
      ...runMetrics,
    }),

    toAggregateSummary: (context: AggregateSummaryContext) => ({
      ...context,
      scoresWrittenTotal: scoresWrittenTotal(aggregate),
      scoresFailedTotal: scoresFailedTotal(aggregate),
      ...aggregate,
    }),
  };
};
