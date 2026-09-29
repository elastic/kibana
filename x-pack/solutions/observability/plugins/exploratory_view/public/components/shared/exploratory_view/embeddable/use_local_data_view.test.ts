/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useLocalDataView } from './use_local_data_view';

const mockUseLocalStorage = vi.fn();
vi.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseLocalStorage(...args),
}));

const mockGetDataTypeIndices = vi.fn();
vi.mock('../../../../utils/observability_data_views', () => {
      const mocked = {
      getDataTypeIndices: (...args: unknown[]) => mockGetDataTypeIndices(...args),
    };
      return { ...mocked, default: mocked };
    });

const mockUseFetcher = vi.fn();
vi.mock('@kbn/observability-shared-plugin/public', () => {
      const mocked = {
      useFetcher: (fn: () => unknown, deps: unknown[]) => mockUseFetcher(fn, deps),
    };
      return { ...mocked, default: mocked };
    });

describe('useLocalDataView', () => {
  const setDataViewTitle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFetcher.mockReturnValue({ data: undefined });
  });

  it('prefers an explicit dataTypesIndexPatterns title over a stale localStorage value', () => {
    // Simulate a stale value cached from a previously viewed local monitor.
    mockUseLocalStorage.mockReturnValue(['synthetics-*', setDataViewTitle, vi.fn()]);

    const { result } = renderHook(() =>
      useLocalDataView('synthetics', { synthetics: 'remote-a:synthetics-*' })
    );

    expect(result.current.dataViewTitle).toBe('remote-a:synthetics-*');
  });

  it('falls back to the localStorage value when no explicit override is provided', () => {
    mockUseLocalStorage.mockReturnValue(['synthetics-*', setDataViewTitle, vi.fn()]);

    const { result } = renderHook(() => useLocalDataView('synthetics', undefined));

    expect(result.current.dataViewTitle).toBe('synthetics-*');
  });

  it('returns the explicit override even when localStorage is empty', () => {
    mockUseLocalStorage.mockReturnValue(['', setDataViewTitle, vi.fn()]);

    const { result } = renderHook(() =>
      useLocalDataView('synthetics', { synthetics: 'remote-a:synthetics-*' })
    );

    expect(result.current.dataViewTitle).toBe('remote-a:synthetics-*');
  });
});
