/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants, PerformanceObserver, monitorEventLoopDelay } from 'perf_hooks';
import { startProcessHealthCollection } from './process_health_collectors';

jest.mock('perf_hooks', () => ({
  ...jest.requireActual('perf_hooks'),
  PerformanceObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => []),
  })),
  monitorEventLoopDelay: jest.fn(() => ({
    enable: jest.fn(),
    disable: jest.fn(),
    percentile: jest.fn(() => 1000000),
    max: 2000000,
  })),
}));

const memorySample = (megabytes: number): NodeJS.MemoryUsage => ({
  heapUsed: megabytes * 1024 * 1024,
  heapTotal: megabytes * 1024 * 1024,
  rss: megabytes * 1024 * 1024,
  external: megabytes * 1024 * 1024,
  arrayBuffers: megabytes * 1024 * 1024,
});

const gcEntry = (kind: number, duration: number) => ({
  name: 'gc',
  entryType: 'gc' as const,
  startTime: 0,
  duration,
  detail: { kind },
  toJSON: () => ({}),
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

it('retains sampled peaks and drains pending GC observations while stopping its resources', () => {
  jest.useFakeTimers();
  jest
    .spyOn(process, 'memoryUsage')
    .mockReturnValueOnce(memorySample(10))
    .mockReturnValueOnce(memorySample(30))
    .mockReturnValue(memorySample(20));
  const collector = startProcessHealthCollection();
  jest.advanceTimersByTime(1000);

  const observer = jest.mocked(PerformanceObserver).mock.results[0].value;
  const [recordGc] = jest.mocked(PerformanceObserver).mock.calls[0];
  const entries = [gcEntry(constants.NODE_PERFORMANCE_GC_MINOR, 1.14)];
  recordGc(
    { getEntries: () => entries, getEntriesByName: () => entries, getEntriesByType: () => entries },
    observer
  );
  observer.takeRecords.mockReturnValue([
    gcEntry(constants.NODE_PERFORMANCE_GC_MINOR, 2.14),
    gcEntry(constants.NODE_PERFORMANCE_GC_MAJOR, 5.14),
  ]);

  const result = collector.stop();
  expect(result.memory).toMatchObject({
    start: memorySample(10),
    end: memorySample(20),
    peak: { heapUsed: 30 * 1024 * 1024 },
  });
  expect(result.gc).toEqual({
    count: 3,
    pauseMs: 8.4,
    byKind: { minor: { count: 2, pauseMs: 3.3 }, major: { count: 1, pauseMs: 5.1 } },
  });
  expect(observer.disconnect).toHaveBeenCalledTimes(1);
  expect(jest.mocked(monitorEventLoopDelay).mock.results[0].value.disable).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
