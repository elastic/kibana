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
  deferToPhase2Count: number;
  notInStoreCount: number;
  lookupDocsUpserted: number;
  lookupDocsDeleted: number;
  lookupPrunedDocs: number;
}

const METRIC_KEYS: ReadonlyArray<keyof RunMetrics> = [
  'scoresWrittenBase',
  'scoresWrittenResolution',
  'scoresWrittenResetToZero',
  'pagesProcessed',
  'deferToPhase2Count',
  'notInStoreCount',
  'lookupDocsUpserted',
  'lookupDocsDeleted',
  'lookupPrunedDocs',
];

const emptyMetrics = (): RunMetrics => ({
  scoresWrittenBase: 0,
  scoresWrittenResolution: 0,
  scoresWrittenResetToZero: 0,
  pagesProcessed: 0,
  deferToPhase2Count: 0,
  notInStoreCount: 0,
  lookupDocsUpserted: 0,
  lookupDocsDeleted: 0,
  lookupPrunedDocs: 0,
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
        deferToPhase2Count: number;
        notInStoreCount: number;
        lookupDocsUpserted: number;
        lookupDocsDeleted: number;
      }
    ) => {
      target.scoresWrittenBase = summary.scoresWritten;
      target.pagesProcessed = summary.pagesProcessed;
      target.deferToPhase2Count = summary.deferToPhase2Count;
      target.notInStoreCount = summary.notInStoreCount;
      target.lookupDocsUpserted = summary.lookupDocsUpserted;
      target.lookupDocsDeleted = summary.lookupDocsDeleted;
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
