/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  EntityInventoryDateRangeProvider,
  useEntityInventoryDateRange,
} from './date_range_context';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EntityInventoryDateRangeProvider>{children}</EntityInventoryDateRangeProvider>
);

describe('EntityInventoryDateRangeProvider', () => {
  it('has no date range until one is set', () => {
    const { result } = renderHook(() => useEntityInventoryDateRange(), { wrapper });

    expect(result.current.dateRange).toBeUndefined();
  });

  it('keeps the date range that was set', () => {
    const { result } = renderHook(() => useEntityInventoryDateRange(), { wrapper });

    act(() => result.current.setDateRange({ from: 'now-1h', to: 'now' }));

    expect(result.current.dateRange).toEqual({ from: 'now-1h', to: 'now' });
  });

  it('replaces the date range when another one is set', () => {
    const { result } = renderHook(() => useEntityInventoryDateRange(), { wrapper });

    act(() => result.current.setDateRange({ from: 'now-1h', to: 'now' }));
    act(() => result.current.setDateRange({ from: 'now-2h', to: 'now-1h' }));

    expect(result.current.dateRange).toEqual({ from: 'now-2h', to: 'now-1h' });
  });

  it('keeps the same object when an equal date range is set', () => {
    const { result } = renderHook(() => useEntityInventoryDateRange(), { wrapper });

    act(() => result.current.setDateRange({ from: 'now-1h', to: 'now' }));
    const before = result.current.dateRange;
    act(() => result.current.setDateRange({ from: 'now-1h', to: 'now' }));

    expect(result.current.dateRange).toBe(before);
  });

  it('keeps the same setter across updates', () => {
    const { result } = renderHook(() => useEntityInventoryDateRange(), { wrapper });
    const { setDateRange } = result.current;

    act(() => result.current.setDateRange({ from: 'now-1h', to: 'now' }));

    expect(result.current.setDateRange).toBe(setDateRange);
  });

  it('throws a descriptive error when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useEntityInventoryDateRange())).toThrow(
      'useEntityInventoryDateRange must be used within an EntityInventoryDateRangeProvider'
    );
  });
});
