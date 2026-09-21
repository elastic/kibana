/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { RequestCancellationManager } from './request_cancellation_manager';

describe('RequestCancellationManager', () => {
  it('aborts the requests in the current load', () => {
    const manager = new RequestCancellationManager();

    manager.startLoad();
    manager.cancel(AbortReason.CANCELED);

    expect(manager.signal.aborted).toBe(true);
    expect(manager.signal.reason).toBe(AbortReason.CANCELED);
  });

  it('keeps a pre-load cancellation in effect until the next load', () => {
    const manager = new RequestCancellationManager();

    manager.cancel();
    const canceledSignal = manager.signal;
    manager.startLoad();

    expect(manager.signal).toBe(canceledSignal);
    expect(manager.signal.aborted).toBe(true);

    manager.startLoad();

    expect(manager.signal).not.toBe(canceledSignal);
    expect(manager.signal.aborted).toBe(false);
  });

  it('replaces and aborts the prior load when a new one starts', () => {
    const manager = new RequestCancellationManager();

    manager.startLoad();
    const priorLoadSignal = manager.signal;
    manager.startLoad();

    expect(priorLoadSignal.aborted).toBe(true);
    expect(priorLoadSignal.reason).toBe(AbortReason.REPLACED);
    expect(manager.signal.aborted).toBe(false);
  });
});
