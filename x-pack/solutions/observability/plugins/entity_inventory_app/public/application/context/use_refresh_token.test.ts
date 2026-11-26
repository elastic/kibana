/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useRefreshToken } from './use_refresh_token';

describe('useRefreshToken', () => {
  it('starts at zero', () => {
    const { result } = renderHook(() => useRefreshToken('all'));

    expect(result.current.refreshToken).toBe(0);
  });

  it('goes up by one on every bump', () => {
    const { result } = renderHook(() => useRefreshToken('all'));

    act(() => result.current.bumpRefreshToken());
    expect(result.current.refreshToken).toBe(1);

    act(() => result.current.bumpRefreshToken());
    act(() => result.current.bumpRefreshToken());
    expect(result.current.refreshToken).toBe(3);
  });

  it('keeps the same value when it renders again with the same trigger', () => {
    const { result, rerender } = renderHook(({ trigger }) => useRefreshToken(trigger), {
      initialProps: { trigger: 'all' },
    });

    rerender({ trigger: 'all' });
    rerender({ trigger: 'all' });

    expect(result.current.refreshToken).toBe(0);
  });

  it('goes up once when the trigger changes', () => {
    const { result, rerender } = renderHook(({ trigger }) => useRefreshToken(trigger), {
      initialProps: { trigger: 'all' },
    });

    rerender({ trigger: 'hosts' });

    expect(result.current.refreshToken).toBe(1);
  });

  it('goes up on every change of the trigger, also when it returns to an earlier one', () => {
    const { result, rerender } = renderHook(({ trigger }) => useRefreshToken(trigger), {
      initialProps: { trigger: 'all' },
    });

    rerender({ trigger: 'hosts' });
    rerender({ trigger: 'all' });

    expect(result.current.refreshToken).toBe(2);
  });

  it('counts a bump and a change of the trigger together', () => {
    const { result, rerender } = renderHook(({ trigger }) => useRefreshToken(trigger), {
      initialProps: { trigger: 'all' },
    });

    act(() => result.current.bumpRefreshToken());
    rerender({ trigger: 'hosts' });

    expect(result.current.refreshToken).toBe(2);
  });

  it('never commits the new trigger with the old value', () => {
    const committed: Array<{ trigger: string; token: number }> = [];
    const { rerender } = renderHook(
      ({ trigger }) => {
        const { refreshToken: token } = useRefreshToken(trigger);
        useEffect(() => {
          committed.push({ trigger, token });
        });
      },
      { initialProps: { trigger: 'all' } }
    );

    rerender({ trigger: 'hosts' });

    expect(committed).toEqual([
      { trigger: 'all', token: 0 },
      { trigger: 'hosts', token: 1 },
    ]);
  });

  it('keeps the same bump function across renders and changes of the trigger', () => {
    const { result, rerender } = renderHook(({ trigger }) => useRefreshToken(trigger), {
      initialProps: { trigger: 'all' },
    });
    const bump = result.current.bumpRefreshToken;

    rerender({ trigger: 'all' });
    rerender({ trigger: 'hosts' });
    act(() => result.current.bumpRefreshToken());

    expect(result.current.bumpRefreshToken).toBe(bump);
  });
});
