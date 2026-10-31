/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HUNT_WATCH_MIN_TIMEOUT_MS,
  HUNT_WATCH_TIMEOUT_MS,
  pinSingleRepetition,
} from './playwright_settings';

describe('pinSingleRepetition', () => {
  it('overrides a global EVAL_REPETITIONS>1 and says so', () => {
    const env: NodeJS.ProcessEnv = { EVAL_REPETITIONS: '3' };
    const warn = jest.fn();
    pinSingleRepetition(env, warn);
    expect(env.EVAL_REPETITIONS).toBe('1');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('EVAL_REPETITIONS=3'));
  });

  it('pins an unset env to 1 without warning', () => {
    const env: NodeJS.ProcessEnv = {};
    const warn = jest.fn();
    pinSingleRepetition(env, warn);
    expect(env.EVAL_REPETITIONS).toBe('1');
    expect(warn).not.toHaveBeenCalled();
  });

  it('leaves an explicit 1 alone without warning', () => {
    const env: NodeJS.ProcessEnv = { EVAL_REPETITIONS: '1' };
    const warn = jest.fn();
    pinSingleRepetition(env, warn);
    expect(env.EVAL_REPETITIONS).toBe('1');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('playwright budget sized from the fixture count', () => {
  it(`timeout ${HUNT_WATCH_TIMEOUT_MS}ms covers reports x phases at the per-hunt budget`, () => {
    expect(HUNT_WATCH_TIMEOUT_MS).toBeGreaterThanOrEqual(HUNT_WATCH_MIN_TIMEOUT_MS);
  });
});
