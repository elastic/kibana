/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { createPageStepTimings } from './page_step_timings';

describe('createPageStepTimings', () => {
  let now = 0;

  beforeEach(() => {
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const takes =
    <T>(ms: number, value: T) =>
    async () => {
      now += ms;
      return value;
    };

  it('reports page 1 apart from the pages after it', async () => {
    const timings = createPageStepTimings();

    timings.startPage();
    await timings.time('esql', takes(500, { took: 300 }), (response) => response.took);
    now += 50;
    timings.startPage();
    await timings.time('esql', takes(100, { took: 60 }), (response) => response.took);
    timings.startPage();
    await timings.time('esql', takes(120, { took: 70 }), (response) => response.took);

    expect(timings.summary()).toMatchObject({
      firstPage: {
        pages: 1,
        wallMs: 550,
        untimedMs: 50,
        steps: { esql: { ms: 500, calls: 1, esTookMs: 300 } },
      },
      laterPages: {
        pages: 2,
        wallMs: 220,
        untimedMs: 0,
        steps: { esql: { ms: 220, calls: 2, esTookMs: 130 } },
      },
    });
  });

  it('keeps the time of a page that turned out not to exist without counting it', async () => {
    const timings = createPageStepTimings();

    timings.startPage();
    await timings.time('discovery', takes(10, {}));
    timings.startPage();
    await timings.time('discovery', takes(10, {}));
    timings.startPage();
    await timings.time('discovery', takes(5, null));
    timings.dropPage();

    expect(timings.summary().laterPages).toMatchObject({
      pages: 1,
      wallMs: 15,
      untimedMs: 0,
      steps: { discovery: { ms: 15, calls: 2 } },
    });
  });

  it('times synchronous steps and leaves out took for steps without one', () => {
    const timings = createPageStepTimings();

    timings.startPage();
    const parsed = timings.timeSync('parse', () => {
      now += 40;
      return ['row'];
    });

    expect(parsed).toEqual(['row']);
    expect(timings.summary()).toMatchObject({
      firstPage: { pages: 1, wallMs: 40, untimedMs: 0, steps: { parse: { ms: 40, calls: 1 } } },
      laterPages: undefined,
    });
  });

  it('reports nothing for a stage without pages', async () => {
    const timings = createPageStepTimings();

    timings.startPage();
    await timings.time('discovery', takes(0, null));
    timings.dropPage();

    expect(timings.summary().laterPages).toBeUndefined();
    expect(timings.summary().firstPage).toMatchObject({
      pages: 0,
      wallMs: 0,
      untimedMs: 0,
      steps: { discovery: { ms: 0, calls: 1 } },
    });
  });
});

describe('failed steps and bounded profiling', () => {
  afterEach(() => jest.restoreAllMocks());

  it('accounts for rejected requests and synchronous failures while preserving errors', async () => {
    let now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const timings = createPageStepTimings();
    const failure = new Error('request failed');
    timings.startPage();
    await expect(
      timings.time('esql', async () => {
        now = 40;
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(() =>
      timings.timeSync('parse', () => {
        now = 50;
        throw failure;
      })
    ).toThrow(failure);
    expect(timings.summary().firstPage).toMatchObject({
      wallMs: 50,
      untimedMs: 0,
      steps: {
        esql: { calls: 1, failures: 1, ms: 40, maxMs: 40 },
        parse: { calls: 1, failures: 1, ms: 10 },
      },
    });
  });

  it('profiles only the first five eligible pages when explicitly enabled', () => {
    const timings = createPageStepTimings({ profile: true });
    const sampledPages: number[] = [];
    for (let page = 1; page <= 1000; page++) {
      timings.startPage();
      if (timings.shouldProfile()) {
        sampledPages.push(page);
        timings.recordProfile({ wallMs: 10, rows: 1 });
      }
    }
    expect(sampledPages).toEqual([1, 21, 41, 61, 81]);
    expect(timings.summary().profiles).toHaveLength(5);
    const defaults = createPageStepTimings();
    defaults.startPage();
    expect(defaults.shouldProfile()).toBe(false);
  });

  it('keeps exact totals and bounded percentile estimates over many calls', async () => {
    let now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    const timings = createPageStepTimings();
    timings.startPage();
    timings.startPage();
    for (let duration = 1; duration <= 1000; duration++) {
      await timings.time('esql', async () => {
        now += duration;
      });
    }
    const total = timings.summary().laterPages?.steps.esql;
    expect(total).toMatchObject({ calls: 1000, ms: 500500, maxMs: 1000, failures: 0 });
    expect(total?.p50Ms).toBeGreaterThanOrEqual(500);
    expect(total?.p50Ms).toBeLessThanOrEqual(546);
    expect(total?.p95Ms).toBeGreaterThanOrEqual(950);
    expect(total?.p95Ms).toBeLessThanOrEqual(1000);
    const snapshot = timings.summary();
    now += 100;
    expect(timings.summary()).toEqual(snapshot);
  });
});
