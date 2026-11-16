/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { SEARCH_DEBOUNCE_MS, useDebouncedText } from './use_debounced_text';

describe('useDebouncedText', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const pause = () => act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

  it('applies what was typed once the user pauses, not at each keystroke', () => {
    const apply = jest.fn();
    const { result } = renderHook(() => useDebouncedText('', apply));

    act(() => result.current[1]('ca'));
    act(() => result.current[1]('cart'));
    expect(apply).not.toHaveBeenCalled();

    pause();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith('cart');
  });

  it('follows the applied text when it changes elsewhere, e.g. on Back', () => {
    const { result, rerender } = renderHook(({ applied }) => useDebouncedText(applied, jest.fn()), {
      initialProps: { applied: 'cart' },
    });
    expect(result.current[0]).toBe('cart');

    rerender({ applied: '' });
    expect(result.current[0]).toBe('');
  });

  it('leaves spaces the user is still typing around an applied search alone', () => {
    const apply = jest.fn();
    const { result, rerender } = renderHook(
      ({ applied }) => useDebouncedText(applied, apply),
      { initialProps: { applied: 'cart' } }
    );

    act(() => result.current[1]('cart '));
    pause();

    expect(apply).not.toHaveBeenCalled();
    rerender({ applied: 'cart' });
    expect(result.current[0]).toBe('cart ');
  });
});
