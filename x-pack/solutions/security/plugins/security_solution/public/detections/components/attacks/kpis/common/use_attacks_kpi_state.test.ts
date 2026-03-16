/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../../../../common/components/local_storage';
import { KpiViewSelection } from '../kpi_view_select/helpers';
import type { GroupBySelection } from '../../../alerts_kpis/alerts_progress_bar_panel/types';
import { useAttacksKpiState } from './use_attacks_kpi_state';

// Mock useLocalStorage
jest.mock('../../../../../common/components/local_storage', () => ({
  useLocalStorage: jest.fn(),
}));

describe('useAttacksKpiState', () => {
  const mockSetViewSelection = jest.fn();
  const mockSetStackBy0 = jest.fn();
  const mockSetStackBy1 = jest.fn();
  const mockSetGroupBySelection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalStorage as jest.Mock).mockImplementation(({ key }) => {
      if (key.includes('alert-view-selection')) {
        return ['summary', mockSetViewSelection];
      }
      if (key.includes('stack-by-0')) {
        return ['test.field', mockSetStackBy0];
      }
      if (key.includes('stack-by-1')) {
        return ['test.field.2', mockSetStackBy1];
      }
      if (key.includes('group-by')) {
        return ['host.name', mockSetGroupBySelection];
      }
      return [null, jest.fn()];
    });
  });

  it('should return default values', () => {
    const { result } = renderHook(() => useAttacksKpiState());

    expect(result.current.viewSelection).toBe('summary');
    expect(result.current.stackBy0).toBe('test.field');
    expect(result.current.groupBySelection).toBe('host.name');
  });

  it('should update viewSelection', () => {
    const { result } = renderHook(() => useAttacksKpiState());

    act(() => {
      result.current.setViewSelection(KpiViewSelection.Trend);
    });

    expect(mockSetViewSelection).toHaveBeenCalledWith(KpiViewSelection.Trend);
  });

  it('should update stackBy0', () => {
    const { result } = renderHook(() => useAttacksKpiState());

    act(() => {
      result.current.setStackBy0('new.field');
    });

    expect(mockSetStackBy0).toHaveBeenCalledWith('new.field');
  });

  it('should update stackBy1', () => {
    const { result } = renderHook(() => useAttacksKpiState());

    act(() => {
      result.current.setStackBy1('new.field.2');
    });

    expect(mockSetStackBy1).toHaveBeenCalledWith('new.field.2');
  });

  it('should update groupBySelection', () => {
    const { result } = renderHook(() => useAttacksKpiState());

    act(() => {
      result.current.setGroupBySelection('rule.name' as GroupBySelection);
    });

    expect(mockSetGroupBySelection).toHaveBeenCalledWith('rule.name');
  });
});
