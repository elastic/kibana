/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRunMetricsTracker } from './run_metrics_tracker';
import { createPageStepTimings } from './page_step_timings';

it('aggregates observed progress from incomplete runs without double counting snapshots', () => {
  const tracker = createRunMetricsTracker();
  const failedRun = tracker.newRun();
  const timings = createPageStepTimings();
  timings.count('scoresCalculated', 4);
  timings.count('scoresMissingFromStore', 1);
  timings.count('scoresDroppedNotInStore', 1);
  timings.count('riskDocumentsWritten', 3);
  timings.count('storeDocumentsWritten', 2);
  timings.count('storeWriteFailures', 1);
  tracker.recordPageProgress(failedRun, 'base', timings.summary());
  const completedRun = tracker.newRun();
  completedRun.scoresWrittenRiskIndexBase = 5;
  const context = {
    namespace: 'default',
    durationMs: 10,
    entityTypesProcessed: 2,
    idBasedRiskScoringEnabled: true,
  };
  const snapshot = tracker.toAggregateSummary(context);
  expect(snapshot).toMatchObject({
    scoresWrittenRiskIndexTotal: 8,
    scoresWrittenEntityStoreBase: 2,
    scoresFailedTotal: 1,
    scoresCalculatedBase: 4,
  });
  expect(tracker.toAggregateSummary(context)).toEqual(snapshot);
});
