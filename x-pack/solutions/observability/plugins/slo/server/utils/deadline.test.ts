/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOOperationTimeout } from '../errors';
import { createDeadline } from './deadline';

describe('createDeadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts the signal with an SLOOperationTimeout once the timeout elapses', () => {
    const { signal } = createDeadline(1000);

    jest.advanceTimersByTime(999);
    expect(signal.aborted).toBe(false);

    jest.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeInstanceOf(SLOOperationTimeout);
  });

  it('never aborts once cleared', () => {
    const { signal, clear } = createDeadline(1000);

    clear();
    jest.advanceTimersByTime(5000);

    expect(signal.aborted).toBe(false);
  });
});
