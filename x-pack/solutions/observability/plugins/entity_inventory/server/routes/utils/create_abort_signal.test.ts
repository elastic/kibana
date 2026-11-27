/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { createAbortSignal } from './create_abort_signal';

describe('createAbortSignal', () => {
  it('stays unaborted until the request is aborted', () => {
    const aborted$ = new Subject<void>();

    const signal = createAbortSignal(aborted$);

    expect(signal.aborted).toBe(false);
  });

  it('aborts when the request is aborted', () => {
    const aborted$ = new Subject<void>();
    const signal = createAbortSignal(aborted$);

    aborted$.next();

    expect(signal.aborted).toBe(true);
  });

  it('stays unaborted when the request completes without an abort', () => {
    const aborted$ = new Subject<void>();
    const signal = createAbortSignal(aborted$);

    aborted$.complete();

    expect(signal.aborted).toBe(false);
  });
});
