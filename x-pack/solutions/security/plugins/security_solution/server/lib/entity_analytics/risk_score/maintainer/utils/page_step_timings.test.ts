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

    expect(timings.summary()).toEqual({
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

    expect(timings.summary().laterPages).toEqual({
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
    expect(timings.summary()).toEqual({
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
    expect(timings.summary().firstPage).toEqual({
      pages: 0,
      wallMs: 0,
      untimedMs: 0,
      steps: { discovery: { ms: 0, calls: 1 } },
    });
  });
});
