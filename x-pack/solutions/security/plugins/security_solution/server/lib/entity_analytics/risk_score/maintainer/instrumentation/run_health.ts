/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { startProcessHealthCollection } from './process_health_collectors';
import { buildRunHealthSummary, summarizeBackgroundActivity } from './run_health_summary';
import type {
  ProcessSnapshot,
  RunHealthMonitor,
  RunHealthSummary,
  RunHealthTracker,
} from './run_health_types';

/** Measures process health during calculation windows and the gaps between them. */
export const createRunHealthTracker = (): RunHealthTracker => {
  let previousRunEnd: ProcessSnapshot | undefined;
  let activeRuns = 0;

  return {
    start: () => {
      const startedAt = takeProcessSnapshot();
      const concurrentRunsAtStart = activeRuns;
      const background =
        previousRunEnd && concurrentRunsAtStart === 0
          ? summarizeBackgroundActivity(previousRunEnd, startedAt)
          : undefined;
      activeRuns += 1;

      return startRunHealthMonitor({ startedAt, concurrentRunsAtStart, background }, (endedAt) => {
        activeRuns -= 1;
        if (activeRuns === 0) previousRunEnd = endedAt;
      });
    },
  };
};

const startRunHealthMonitor = (
  context: RunWindowContext,
  onStop: (endedAt: ProcessSnapshot) => void
): RunHealthMonitor => {
  const collectors = startProcessHealthCollection();
  const marks: RunHealthSummary['marks'] = [];
  let completedSummary: RunHealthSummary | undefined;

  return {
    mark: (name) => {
      if (completedSummary) return;
      const memory = collectors.sampleMemory();
      marks.push({
        name,
        atMs: performance.now() - context.startedAt.atMs,
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      });
    },
    stop: () => {
      if (completedSummary) return completedSummary;
      const observations = collectors.stop();
      const endedAt = takeProcessSnapshot();
      onStop(endedAt);
      completedSummary = buildRunHealthSummary({ ...context, endedAt, observations, marks });
      return completedSummary;
    },
  };
};

const takeProcessSnapshot = (): ProcessSnapshot => ({
  atMs: performance.now(),
  cpu: process.cpuUsage(),
  elu: performance.eventLoopUtilization(),
});

interface RunWindowContext {
  startedAt: ProcessSnapshot;
  concurrentRunsAtStart: number;
  background?: RunHealthSummary['background'];
}

export type { RunHealthSummary, RunHealthMonitor, RunHealthTracker } from './run_health_types';
