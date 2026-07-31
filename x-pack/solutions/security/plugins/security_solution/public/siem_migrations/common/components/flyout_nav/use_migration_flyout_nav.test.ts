/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useMigrationFlyoutNav } from './use_migration_flyout_nav';

describe('useMigrationFlyoutNav', () => {
  it('reports no previous item and an available next item at the start of the list', () => {
    const { result } = renderHook(() =>
      useMigrationFlyoutNav({
        currentIdx: 0,
        totalItems: 3,
        onNextCallback: jest.fn(),
        onPrevCallback: jest.fn(),
      })
    );
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it('moves the user to the next item when one is available', () => {
    const onNextCallback = jest.fn();
    const { result } = renderHook(() =>
      useMigrationFlyoutNav({
        currentIdx: 0,
        totalItems: 3,
        onNextCallback,
        onPrevCallback: jest.fn(),
      })
    );
    act(() => result.current.goToNext());
    expect(onNextCallback).toHaveBeenCalledWith(1);
  });

  it('keeps the user in place when they try to advance past the last item', () => {
    const onNextCallback = jest.fn();
    const { result } = renderHook(() =>
      useMigrationFlyoutNav({
        currentIdx: 2,
        totalItems: 3,
        onNextCallback,
        onPrevCallback: jest.fn(),
      })
    );
    act(() => result.current.goToNext());
    expect(onNextCallback).not.toHaveBeenCalled();
    expect(result.current.hasNext).toBe(false);
  });

  it('moves the user to the previous item when one is available', () => {
    const onPrevCallback = jest.fn();
    const { result } = renderHook(() =>
      useMigrationFlyoutNav({
        currentIdx: 2,
        totalItems: 3,
        onNextCallback: jest.fn(),
        onPrevCallback,
      })
    );
    act(() => result.current.goToPrevious());
    expect(onPrevCallback).toHaveBeenCalledWith(1);
  });

  it('keeps the user in place when they try to go back from the first item', () => {
    const onPrevCallback = jest.fn();
    const { result } = renderHook(() =>
      useMigrationFlyoutNav({
        currentIdx: 0,
        totalItems: 3,
        onNextCallback: jest.fn(),
        onPrevCallback,
      })
    );
    act(() => result.current.goToPrevious());
    expect(onPrevCallback).not.toHaveBeenCalled();
    expect(result.current.hasPrevious).toBe(false);
  });
});
