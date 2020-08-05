/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PerformanceObserver } from 'perf_hooks';

export interface Perf {
  numberOfTasksRanOverall: number;
  cycles: {
    fillPoolStarts: number;
    fillPoolCycles: number;
    fillPoolBail: number;
    claimedOnRerunCycle: number;
    fillPoolBailNoTasks: number;
  };
  claimAvailableTasksNoTasks: number;
  claimAvailableTasksNoAvailableWorkers: number;
  elasticsearchApiCalls: {
    timeUntilFirstRun: number[];
    timeUntilFirstMarkAsRun: number[];
    firstMarkAsRunningTillRan: number[];
    timeFromMarkAsRunTillRun: number[];
    timeFromRunTillNextMarkAsRun: number[];
    claimAvailableTasks: number[];
  };
  activityDuration: number[];
  sleepDuration: number[];
  taskPollerActivityDurationPreScheduleComplete: number[];
  taskPoolAttemptToRun: number[];
  taskRunnerMarkTaskAsRunning: number[];

  summarize: Array<[(perf: PerfResult) => void, (perfTestDuration: number) => PerfResult]>;
}

export interface PerfState {
  performanceObserver?: PerformanceObserver;
  runningAverageTasksPerSecond: number;
  averagesTaken: number[];
  runningAverageLeadTime: number;
  averagesTakenLeadTime: number[];
  leadTimeQueue: number[];
  performance: Perf;
  capturing: boolean;
}

export interface PerfResult {
  perfTestDuration: string;
  runningAverageTasksPerSecond: number;
  runningAverageLeadTime: number;
  numberOfTasksRanOverall: number;
  claimAvailableTasksNoTasks: number;
  claimAvailableTasksNoAvailableWorkers: number;
  elasticsearchApiCalls: {
    timeUntilFirstRun: PerfAvg;
    timeUntilFirstMarkAsRun: PerfAvg;
    firstMarkAsRunningTillRan: PerfAvg;
    timeFromMarkAsRunTillRun: PerfAvg;
    timeFromRunTillNextMarkAsRun: PerfAvg;
    claimAvailableTasks: PerfAvg;
  };
  sleepDuration: string;
  activityDuration: string;
  cycles: Perf['cycles'];
  taskPoolAttemptToRun: PerfAvg;
  taskRunnerMarkTaskAsRunning: PerfAvg;
}

export interface PerfApi {
  capture: () => void;
  endCapture: () => Promise<PerfResult>;
  summarize: (perfTestDuration: number) => PerfResult;
}

export interface PerfAvg {
  mean: number;
  range: {
    min: number;
    max: number;
  };
}
