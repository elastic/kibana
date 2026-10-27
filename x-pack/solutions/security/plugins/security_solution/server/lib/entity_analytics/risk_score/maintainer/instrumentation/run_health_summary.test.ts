/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRunHealthSummary, summarizeBackgroundActivity } from './run_health_summary';
import type { MemorySample, ProcessSnapshot } from './run_health_types';

const startedAt: ProcessSnapshot = {
  atMs: 100,
  cpu: { user: 1000, system: 1000 },
  elu: { idle: 10, active: 10, utilization: 0.5 },
};
const endedAt: ProcessSnapshot = {
  atMs: 1100,
  cpu: { user: 301000, system: 51000 },
  elu: { idle: 710, active: 310, utilization: 310 / 1020 },
};
const memorySample = (megabytes: number): MemorySample => ({
  heapUsed: megabytes * 1024 * 1024,
  rss: megabytes * 1024 * 1024,
  external: megabytes * 1024 * 1024,
  arrayBuffers: megabytes * 1024 * 1024,
});

it('derives CPU, event-loop and memory measurements from the completed observation window', () => {
  const observations = {
    memory: {
      start: memorySample(10),
      end: memorySample(20),
      peak: memorySample(30),
      heapLimit: 1024 * 1024 * 1024,
    },
    gc: { count: 2, pauseMs: 1.5, byKind: { minor: { count: 2, pauseMs: 1.5 } } },
    eventLoopDelayNs: { p50: 1500000, p99: 3400000, max: 5800000 },
  };
  const summary = buildRunHealthSummary({
    startedAt,
    endedAt,
    observations,
    concurrentRunsAtStart: 1,
    marks: [],
  });
  expect(summary).toMatchObject({
    durationMs: 1000,
    concurrentRunsAtStart: 1,
    cpu: { userMs: 300, systemMs: 50, cores: 0.35 },
    eventLoop: { utilization: 0.3, delayMs: { p50: 1.5, p99: 3.4, max: 5.8 } },
    heapMb: { start: 10, end: 20, peak: 30, limit: 1024 },
    externalMb: { start: 10, end: 20, peak: 30 },
    arrayBuffersMb: { start: 10, end: 20, peak: 30 },
    rssMb: { start: 10, peak: 30 },
    gc: observations.gc,
  });
  expect(
    buildRunHealthSummary({ startedAt, endedAt, observations, concurrentRunsAtStart: 1, marks: [] })
  ).toEqual(summary);
});

it('uses the same snapshot boundaries for background CPU and event-loop utilization', () => {
  expect(summarizeBackgroundActivity(startedAt, endedAt)).toEqual({
    windowMs: 1000,
    cores: 0.35,
    eventLoopUtilization: 0.3,
  });
});
