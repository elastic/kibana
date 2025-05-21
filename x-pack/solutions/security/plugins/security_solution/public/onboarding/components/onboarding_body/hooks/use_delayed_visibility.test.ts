/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useDelayedVisibility } from './use_delayed_visibility';
import { HEIGHT_ANIMATION_DURATION } from '../onboarding_card_panel.styles';

jest.useFakeTimers();

describe('useDelayedVisibility Hook', () => {
  it('should return true immediately when isExpanded is true', () => {
    const { result } = renderHook(() => useDelayedVisibility({ isExpanded: true }));

    expect(result.current).toBe(true);
  });

  it('should return false immediately when isExpanded is false', () => {
    const { result } = renderHook(() => useDelayedVisibility({ isExpanded: false }));

    expect(result.current).toBe(false);
  });

  it('should delay setting isVisible to false when collapsing', () => {
    const { result, rerender } = renderHook(
      ({ isExpanded }) => useDelayedVisibility({ isExpanded }),
      { initialProps: { isExpanded: true } }
    );

    expect(result.current).toBe(true);

    rerender({ isExpanded: false });
    expect(result.current).toBe(true); // Still true due to delay

    act(() => {
      jest.advanceTimersByTime(HEIGHT_ANIMATION_DURATION);
    });

    expect(result.current).toBe(false); // Now false after delay
  });

  it('should immediately set isVisible to true when expanding', () => {
    const { result, rerender } = renderHook(
      ({ isExpanded }) => useDelayedVisibility({ isExpanded }),
      { initialProps: { isExpanded: false } }
    );

    expect(result.current).toBe(false);

    rerender({ isExpanded: true });
    expect(result.current).toBe(true); // Immediately true
  });

  it('should clean up the timeout when unmounting', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount, rerender } = renderHook(
      ({ isExpanded }) => useDelayedVisibility({ isExpanded }),
      { initialProps: { isExpanded: true } }
    );

    rerender({ isExpanded: false });

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
