/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useMinimumConfidenceScoreDraft } from './use_minimum_confidence_score_draft';

const changeEvent = (value: string) =>
  ({ target: { value } } as React.ChangeEvent<HTMLInputElement>);

describe('useMinimumConfidenceScoreDraft', () => {
  it('displays the value as a 0–100 percentage integer', () => {
    const { result } = renderHook(() =>
      useMinimumConfidenceScoreDraft({ current: 0.85, onChange: jest.fn() })
    );
    expect(result.current.draft).toBe(85);
  });

  it('displays 0 for 0.0 and 100 for 1.0', () => {
    const { result, rerender } = renderHook(
      (props: { current: number }) =>
        useMinimumConfidenceScoreDraft({ current: props.current, onChange: jest.fn() }),
      { initialProps: { current: 0 } }
    );
    expect(result.current.draft).toBe(0);

    rerender({ current: 1 });
    expect(result.current.draft).toBe(100);
  });

  it('persists once on blur, not per keystroke', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useMinimumConfidenceScoreDraft({ current: 0.85, onChange })
    );

    act(() => result.current.onValueChange(changeEvent('9')));
    act(() => result.current.onValueChange(changeEvent('90')));

    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.onBlur());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0.9);
  });

  it('does not persist when blurred on the unchanged value', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useMinimumConfidenceScoreDraft({ current: 0.85, onChange })
    );

    act(() => result.current.onBlur());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores out-of-range inputs (> 100)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useMinimumConfidenceScoreDraft({ current: 0.85, onChange })
    );

    act(() => result.current.onValueChange(changeEvent('101')));
    act(() => result.current.onBlur());

    // Draft stays at 85 (the original); the invalid keystroke was discarded.
    expect(result.current.draft).toBe(85);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores out-of-range inputs (< 0)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useMinimumConfidenceScoreDraft({ current: 0.5, onChange }));

    act(() => result.current.onValueChange(changeEvent('-1')));
    act(() => result.current.onBlur());

    expect(result.current.draft).toBe(50);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('re-syncs when the server echoes a different value (optimistic rollback)', () => {
    const { result, rerender } = renderHook(
      (props: { current: number }) =>
        useMinimumConfidenceScoreDraft({ current: props.current, onChange: jest.fn() }),
      { initialProps: { current: 0.85 } }
    );

    rerender({ current: 0.7 });

    expect(result.current.draft).toBe(70);
  });

  it('clearing the field and blurring restores the last persisted value instead of writing 0', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useMinimumConfidenceScoreDraft({ current: 0.85, onChange })
    );

    act(() => result.current.onValueChange(changeEvent('')));
    expect(result.current.draft).toBe('');

    act(() => result.current.onBlur());

    expect(result.current.draft).toBe(85);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clearing, typing a new value, then blurring persists the typed value (not 0)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useMinimumConfidenceScoreDraft({ current: 0.85, onChange })
    );

    act(() => result.current.onValueChange(changeEvent('')));
    act(() => result.current.onValueChange(changeEvent('9')));
    act(() => result.current.onValueChange(changeEvent('90')));
    act(() => result.current.onBlur());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0.9);
  });

  it('does not fire onChange again after a server echo of the same value', () => {
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      (props: { current: number }) =>
        useMinimumConfidenceScoreDraft({ current: props.current, onChange }),
      { initialProps: { current: 0.85 } }
    );

    act(() => result.current.onValueChange(changeEvent('90')));
    act(() => result.current.onBlur());

    expect(onChange).toHaveBeenCalledTimes(1);

    // Server echoes 0.9 back.
    rerender({ current: 0.9 });

    // No second persist triggered by the echo.
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
