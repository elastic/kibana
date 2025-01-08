/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CachedSubject, retryOnError$ } from './rxjs_helpers';
import * as rx from 'rxjs';

describe('telemetry.helpers.rxjs.retryOnError$', () => {
  const retries = 5;
  const delay = 100;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not retry if the computation does not fail', async () => {
    const callback = jest.fn(() => 'success');

    retryOnError$(1, 100, callback).subscribe({
      next: (response) => {
        expect(response).toBe('success');
      },
      error: (err) => {
        throw new Error(`Unexpected error: ${err}`);
      },
    });

    await jest.advanceTimersByTimeAsync(delay * 1.1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should retry runtime errors until the computation works', async () => {
    const callback = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('first');
      })
      .mockImplementationOnce(() => {
        throw new Error('second');
      })
      .mockImplementationOnce(() => 'success');

    retryOnError$(retries, delay, callback).subscribe({
      next: (response) => {
        expect(response).toBe('success');
      },
      error: (err) => {
        throw new Error(`Unexpected error: ${err}`);
      },
    });

    await jest.advanceTimersByTimeAsync(delay * 2 * 1.1);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should exhaust retries with runtime errors and emit an error', async () => {
    const callback = jest.fn().mockImplementation(() => {
      throw new Error('boom!');
    });

    retryOnError$(retries, delay, callback).subscribe({
      next: (response) => {
        expect(response.message).toBe('boom!');
      },
      error: (err) => {
        throw new Error(`Unexpected error: ${err}`);
      },
    });

    await jest.advanceTimersByTimeAsync(retries * delay * 1.1);

    expect(callback).toHaveBeenCalledTimes(retries + 1);
  });

  it('should exhaust retries with rejected promises and emit an error', async () => {
    const callback = jest.fn().mockImplementation(() => Promise.reject(new Error('boom!')));

    retryOnError$(retries, delay, callback).subscribe({
      next: (response) => {
        expect(response.message).toBe('boom!');
      },
      error: (err) => {
        throw new Error(`Unexpected error: ${err}`);
      },
    });

    await jest.advanceTimersByTimeAsync(retries * delay * 1.1);

    expect(callback).toHaveBeenCalledTimes(retries + 1);
  });

  it('should retry rejected promises until the computation works', async () => {
    const callback = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('first')))
      .mockImplementationOnce(() => Promise.reject(new Error('second')))
      .mockImplementationOnce(() => Promise.resolve('success'));

    retryOnError$(retries, delay, callback).subscribe({
      next: (response) => {
        expect(response).toBe('success');
      },
      error: (err) => {
        throw new Error(`Unexpected error: ${err}`);
      },
    });

    await jest.advanceTimersByTimeAsync(delay * 3 * 1.1);

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should retry rejected promises and runtime errors until the computation works', async () => {
    const callback = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('first')))
      .mockImplementationOnce(() => {
        throw new Error('second');
      })
      .mockImplementationOnce(() => Promise.resolve('success'));

    retryOnError$(retries, delay, callback).subscribe({
      next: (response) => {
        expect(response).toBe('success');
      },
      error: (err) => {
        throw new Error(`Unexpected error: ${err}`);
      },
    });

    await jest.advanceTimersByTimeAsync(delay * 3 * 1.1);

    expect(callback).toHaveBeenCalledTimes(3);
  });
});

describe('CachedSubject', () => {
  it('should cache values until is flushed', () => {
    const elements = [1, 2, 3, 4, 5];
    const subject$ = new rx.Subject<number>();
    const cache = new CachedSubject(subject$);
    const values: number[] = [];

    elements.forEach((v) => subject$.next(v));

    subject$.subscribe({
      next: (v) => values.push(v),
    });

    expect(values).toHaveLength(0);

    cache.stop();
    expect(values).toHaveLength(0);

    cache.flush();
    expect(values).toEqual(elements);
  });
});
