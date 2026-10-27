/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRunHealthTracker } from './run_health';

describe('createRunHealthTracker', () => {
  it('summarizes the run window with process figures', () => {
    const monitor = createRunHealthTracker().start();
    const summary = monitor.stop();

    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
    expect(summary.cpu.userMs).toBeGreaterThanOrEqual(0);
    expect(summary.cpu.systemMs).toBeGreaterThanOrEqual(0);
    expect(summary.eventLoop.utilization).toBeGreaterThanOrEqual(0);
    expect(summary.eventLoop.utilization).toBeLessThanOrEqual(1);
    expect(summary.heapMb.limit).toBeGreaterThan(0);
    expect(summary.heapMb.peak).toBeGreaterThanOrEqual(summary.heapMb.start);
    expect(summary.rssMb.peak).toBeGreaterThanOrEqual(summary.rssMb.start);
    expect(summary.gc.count).toBeGreaterThanOrEqual(0);
  });

  it('records marks in run order with their heap usage', () => {
    const monitor = createRunHealthTracker().start();
    monitor.mark('stage0');
    monitor.mark('host');
    const { marks } = monitor.stop();

    expect(marks.map(({ name }) => name)).toEqual(['stage0', 'host']);
    expect(marks[1].atMs).toBeGreaterThanOrEqual(marks[0].atMs);
    expect(marks.every(({ heapUsedMb }) => heapUsedMb > 0)).toBe(true);
  });

  it('reports the background load since the previous run ended, from the second run on', () => {
    const tracker = createRunHealthTracker();

    const first = tracker.start().stop();
    const second = tracker.start().stop();

    expect(first.background).toBeUndefined();
    expect(second.background).toEqual({
      windowMs: expect.any(Number),
      cores: expect.any(Number),
      eventLoopUtilization: expect.any(Number),
    });
  });

  it('keeps each tracker separate', () => {
    const first = createRunHealthTracker();
    first.start().stop();

    expect(createRunHealthTracker().start().stop().background).toBeUndefined();
  });
});

describe('run health lifecycle', () => {
  it('stops once and keeps its completed summary stable', () => {
    const monitor = createRunHealthTracker().start();
    const completed = monitor.stop();
    monitor.mark('after_completion');
    expect(monitor.stop()).toBe(completed);
    expect(completed.marks).toHaveLength(0);
    expect(completed.externalMb.peak).toBeGreaterThanOrEqual(completed.externalMb.start);
    expect(completed.arrayBuffersMb.peak).toBeGreaterThanOrEqual(completed.arrayBuffersMb.start);
  });

  it('identifies overlapping run windows and resumes background measurement after both end', () => {
    const tracker = createRunHealthTracker();
    const first = tracker.start();
    const second = tracker.start();
    first.stop();
    const overlap = second.stop();
    expect(overlap.concurrentRunsAtStart).toBe(1);
    expect(overlap.background).toBeUndefined();
    expect(tracker.start().stop().background).toBeDefined();
  });
});
