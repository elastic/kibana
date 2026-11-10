/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, NEVER, Subject, throwError } from 'rxjs';
import { readTelemetryOptIn } from './read_telemetry_opt_in';

describe('readTelemetryOptIn', () => {
  it.each<[string, Observable<boolean> | undefined]>([
    ['without the telemetry plugin', undefined],
    ['when no opt-in decision arrives in time', NEVER],
    ['when the stream errors', throwError(() => new Error('boom'))],
  ])('is opted out %s', async (_scenario, isOptedIn$) => {
    await expect(readTelemetryOptIn({ isOptedIn$, timeoutMs: 10 })).resolves.toBe(false);
  });

  it.each([true, false])('returns the current opt-in value %s', async (optedIn) => {
    await expect(
      readTelemetryOptIn({ isOptedIn$: new BehaviorSubject(optedIn), timeoutMs: 10 })
    ).resolves.toBe(optedIn);
  });

  it('is opted out when the stream completes without a value', async () => {
    const isOptedIn$ = new Subject<boolean>();
    const result = readTelemetryOptIn({ isOptedIn$, timeoutMs: 1_000 });
    isOptedIn$.complete();

    await expect(result).resolves.toBe(false);
  });
});
