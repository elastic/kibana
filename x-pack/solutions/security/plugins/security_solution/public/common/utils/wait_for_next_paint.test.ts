/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForNextPaint } from './wait_for_next_paint';

describe('waitForNextPaint', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not resolve before the animation frame fires', async () => {
    const onResolved = jest.fn();

    waitForNextPaint().then(onResolved);
    await Promise.resolve();

    expect(onResolved).not.toHaveBeenCalled();
  });

  it('resolves after the animation frame and the following timeout', async () => {
    const onResolved = jest.fn();

    const promise = waitForNextPaint().then(onResolved);
    await jest.runAllTimersAsync();
    await promise;

    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
