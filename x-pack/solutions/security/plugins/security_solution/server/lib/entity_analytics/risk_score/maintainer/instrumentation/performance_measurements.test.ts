/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPageStepTimings } from './page_step_timings';
import { pageTimingMeasurements, runHealthMeasurements } from './performance_measurements';
import { createRunHealthTracker } from './run_health';

describe('performance telemetry measurements', () => {
  it('exports bounded first-page, later-page and degradation measurements', async () => {
    const timings = createPageStepTimings();
    timings.startPage();
    await timings.time(
      ['esql'],
      async () => ({ took: 4 }),
      ({ took }) => took
    );
    timings.startPage();
    timings.count('partialResponses', 1);
    const metrics = pageTimingMeasurements(timings.summary());
    expect(metrics).toEqual(
      expect.arrayContaining([
        { name: 'firstPage.steps.esTookMs', tags: ['esql'], value: 4, unit: 'ms' },
        { name: 'firstPage.pages', value: 1, unit: 'count' },
        { name: 'laterPages.pages', value: 1, unit: 'count' },
        { name: 'partialResponses', value: 1, unit: 'count' },
      ])
    );
    expect(metrics.every(({ value }) => Number.isFinite(value))).toBe(true);
  });

  it('includes process-wide external memory alongside heap and CPU measurements', () => {
    const health = createRunHealthTracker().start().stop();
    expect(runHealthMeasurements(health)).toEqual(
      expect.arrayContaining([
        { name: 'process.heapMb.peak', value: health.heapMb.peak, unit: 'MiBy' },
        { name: 'process.arrayBuffersMb.peak', value: health.arrayBuffersMb.peak, unit: 'MiBy' },
        { name: 'process.cpu.user', value: health.cpu.userMs, unit: 'ms' },
      ])
    );
  });
});
