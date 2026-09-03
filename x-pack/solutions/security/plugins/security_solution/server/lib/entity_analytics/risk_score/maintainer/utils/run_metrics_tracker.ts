/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepResult } from '../steps/pipeline_types';

export interface RunMetrics {
  scoresWrittenRiskIndexBase: number;
  scoresWrittenRiskIndexResolution: number;
  scoresWrittenRiskIndexResetToZero: number;
  // Entity-store successful writes (0 when dual-write disabled)
  scoresWrittenEntityStoreBase: number;
  scoresWrittenEntityStoreResolution: number;
  scoresWrittenEntityStoreResetToZero: number;
  // Phase 1 scores calculated from alerts before the not_in_store filter
  scoresCalculatedBase: number;
  // Missing-at-lookup scores not recovered by creation
  scoresDroppedNotInStore: number;
  // Scores missing at lookup time, before creation
  scoresMissingFromStoreBase: number;
  scoresFailedBase: number;
  scoresFailedResolution: number;
  scoresFailedResetToZero: number;
  pagesProcessed: number;
  lookupPrunedDocs: number;
  /** Entities created by the create-if-missing path during base scoring. */
  entitiesCreated: number;
  /** Missing scores not written because no alert was found or policy rejected them. */
  entitiesCreateSkipped: number;
  /** Missing scores rejected by EUID/field validation or bulk creation. */
  entitiesCreateFailed: number;
}

const METRIC_KEYS: ReadonlyArray<keyof RunMetrics> = [
  'scoresWrittenRiskIndexBase',
  'scoresWrittenRiskIndexResolution',
  'scoresWrittenRiskIndexResetToZero',
  'scoresWrittenEntityStoreBase',
  'scoresWrittenEntityStoreResolution',
  'scoresWrittenEntityStoreResetToZero',
  'scoresCalculatedBase',
  'scoresDroppedNotInStore',
  'scoresMissingFromStoreBase',
  'scoresFailedBase',
  'scoresFailedResolution',
  'scoresFailedResetToZero',
  'pagesProcessed',
  'lookupPrunedDocs',
  'entitiesCreated',
  'entitiesCreateSkipped',
  'entitiesCreateFailed',
];

const emptyMetrics = (): RunMetrics => ({
  scoresWrittenRiskIndexBase: 0,
  scoresWrittenRiskIndexResolution: 0,
  scoresWrittenRiskIndexResetToZero: 0,
  scoresWrittenEntityStoreBase: 0,
  scoresWrittenEntityStoreResolution: 0,
  scoresWrittenEntityStoreResetToZero: 0,
  scoresCalculatedBase: 0,
  scoresDroppedNotInStore: 0,
  scoresMissingFromStoreBase: 0,
  scoresFailedBase: 0,
  scoresFailedResolution: 0,
  scoresFailedResetToZero: 0,
  pagesProcessed: 0,
  lookupPrunedDocs: 0,
  entitiesCreated: 0,
  entitiesCreateSkipped: 0,
  entitiesCreateFailed: 0,
});

const scoresWrittenRiskIndexTotal = (metrics: RunMetrics): number =>
  metrics.scoresWrittenRiskIndexBase +
  metrics.scoresWrittenRiskIndexResolution +
  metrics.scoresWrittenRiskIndexResetToZero;

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
        scoresWrittenRiskIndex: number;
        scoresWrittenEntityStore: number;
        scoresCalculated: number;
        scoresDroppedNotInStore: number;
        scoresMissingFromStore: number;
        scoresFailed: number;
        pagesProcessed: number;
        entitiesCreated: number;
        entityCreationsSkipped: number;
        entityCreationsFailed: number;
      }
    ) => {
      target.scoresWrittenRiskIndexBase = summary.scoresWrittenRiskIndex;
      target.scoresWrittenEntityStoreBase = summary.scoresWrittenEntityStore;
      target.scoresCalculatedBase = summary.scoresCalculated;
      target.scoresDroppedNotInStore = summary.scoresDroppedNotInStore;
      target.scoresMissingFromStoreBase = summary.scoresMissingFromStore;
      target.scoresFailedBase = summary.scoresFailed;
      target.pagesProcessed = summary.pagesProcessed;
      target.entitiesCreated = summary.entitiesCreated;
      target.entitiesCreateSkipped = summary.entityCreationsSkipped;
      target.entitiesCreateFailed = summary.entityCreationsFailed;
    },

    recordResolution: (target: RunMetrics, result: StepResult) => {
      target.scoresWrittenRiskIndexResolution = result.scoresWrittenRiskIndex;
      target.scoresWrittenEntityStoreResolution = result.scoresWrittenEntityStore;
      target.scoresFailedResolution = result.scoresFailed;
    },

    recordResetToZero: (target: RunMetrics, result: StepResult) => {
      target.scoresWrittenRiskIndexResetToZero = result.scoresWrittenRiskIndex;
      target.scoresWrittenEntityStoreResetToZero = result.scoresWrittenEntityStore;
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
      scoresWrittenRiskIndexTotal: scoresWrittenRiskIndexTotal(runMetrics),
      scoresFailedTotal: scoresFailedTotal(runMetrics),
      ...runMetrics,
    }),

    toAggregateSummary: (context: AggregateSummaryContext) => ({
      ...context,
      scoresWrittenRiskIndexTotal: scoresWrittenRiskIndexTotal(aggregate),
      scoresFailedTotal: scoresFailedTotal(aggregate),
      ...aggregate,
    }),
  };
};
