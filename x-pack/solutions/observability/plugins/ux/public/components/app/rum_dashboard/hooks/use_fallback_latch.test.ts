/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFallbackLatch } from './use_fallback_latch';

interface Props {
  latchKey: string | undefined;
  latchWhen: boolean;
  clearWhen: boolean;
}

const render = (initialProps: Props) =>
  renderHook(
    ({ latchKey, latchWhen, clearWhen }: Props) => useFallbackLatch(latchKey, latchWhen, clearWhen),
    { initialProps }
  );

describe('useFallbackLatch', () => {
  it('starts unlatched', () => {
    const { result } = render({ latchKey: 'apm-*', latchWhen: false, clearWhen: false });

    expect(result.current).toBe(false);
  });

  it('latches while latchWhen is true', () => {
    const { result } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });

    expect(result.current).toBe(true);
  });

  it('stays latched once latchWhen drops back to false', () => {
    // The reason the hook exists: `latchWhen` is derived from a settled request, so it goes back to
    // false the moment that request is re-issued.
    const { result, rerender } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });
    expect(result.current).toBe(true);

    rerender({ latchKey: 'apm-*', latchWhen: false, clearWhen: false });

    expect(result.current).toBe(true);
  });

  it('clears when clearWhen turns true', () => {
    const { result, rerender } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });
    expect(result.current).toBe(true);

    rerender({ latchKey: 'apm-*', latchWhen: false, clearWhen: true });

    expect(result.current).toBe(false);
  });

  it('clears when the key changes', () => {
    const { result, rerender } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });
    expect(result.current).toBe(true);

    rerender({ latchKey: 'traces-*', latchWhen: false, clearWhen: false });

    expect(result.current).toBe(false);
  });

  it('does not re-latch for a new key until latchWhen fires again', () => {
    const { result, rerender } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });

    rerender({ latchKey: 'traces-*', latchWhen: false, clearWhen: false });
    expect(result.current).toBe(false);

    rerender({ latchKey: 'traces-*', latchWhen: true, clearWhen: false });
    expect(result.current).toBe(true);
  });

  it('does not resurrect a stale latch when the key returns to an earlier value', () => {
    // Leaving the key latched on the way out would re-enable the fallback on the way back, before
    // the cheap pass for that key has had a chance to answer.
    const { result, rerender } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });

    rerender({ latchKey: 'traces-*', latchWhen: false, clearWhen: false });
    expect(result.current).toBe(false);

    rerender({ latchKey: 'apm-*', latchWhen: false, clearWhen: false });

    expect(result.current).toBe(false);
  });

  it('latches the new key when it changes while latchWhen is still true', () => {
    const { result, rerender } = render({ latchKey: 'apm-*', latchWhen: true, clearWhen: false });

    rerender({ latchKey: 'traces-*', latchWhen: true, clearWhen: false });
    expect(result.current).toBe(true);

    // The latch moved to the new key rather than lingering on the old one.
    rerender({ latchKey: 'apm-*', latchWhen: false, clearWhen: false });
    expect(result.current).toBe(false);
  });

  it('starts unlatched for an undefined key too', () => {
    // `useDataView` yields `undefined` until the data view resolves, so this is the state the first
    // renders are actually in.
    const { result } = render({ latchKey: undefined, latchWhen: false, clearWhen: false });

    expect(result.current).toBe(false);
  });

  it('latches and clears an undefined key like any other', () => {
    const { result, rerender } = render({ latchKey: undefined, latchWhen: true, clearWhen: false });
    expect(result.current).toBe(true);

    rerender({ latchKey: undefined, latchWhen: false, clearWhen: true });

    expect(result.current).toBe(false);
  });
});
