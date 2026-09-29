/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useFetchAlerts } from './use_fetch_alerts';
import { usePagination, useSorting } from './use_pagination_and_sorting';
import { usePaginatedAlerts } from './use_paginated_alerts';

vi.mock('./use_fetch_alerts');
vi.mock('./use_pagination_and_sorting');

const mockSetPagination = vi.fn();
const mockSetSorting = vi.fn();

const mockPagination = { pageIndex: 0, pageSize: 5 };
const mockSorting = {
  sort: { field: '@timestamp', direction: 'desc' as const },
  enableAllColumns: true,
};
const mockSortConfig: Array<Record<string, 'asc' | 'desc'>> = [{ '@timestamp': 'desc' }];

describe('usePaginatedAlerts', () => {
  beforeEach(() => {
    vi.mocked(usePagination).mockReturnValue({
      pagination: mockPagination,
      setPagination: mockSetPagination,
      pageSizeOptions: [5, 10, 20],
    });

    vi.mocked(useSorting).mockReturnValue({
      sorting: mockSorting,
      setSorting: mockSetSorting,
      sortConfig: mockSortConfig,
    });

    vi.mocked(useFetchAlerts).mockReturnValue({
      data: [],
      totalItemCount: 0,
      loading: false,
      error: false,
    });
  });

  it('returns combined pagination, sorting, and fetch state', () => {
    const { result } = renderHook(() => usePaginatedAlerts(['alert-1', 'alert-2']));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
    expect(result.current.data).toEqual([]);
    expect(result.current.sorting).toEqual(mockSorting);
    expect(result.current.setPagination).toBe(mockSetPagination);
    expect(result.current.setSorting).toBe(mockSetSorting);
    expect(result.current.paginationConfig).toEqual({
      ...mockPagination,
      pageSizeOptions: [5, 10, 20],
      totalItemCount: 0,
    });
  });

  it('passes alertIds and index to useFetchAlerts', () => {
    renderHook(() => usePaginatedAlerts(['alert-1'], 'my-index'));

    expect(vi.mocked(useFetchAlerts)).toHaveBeenCalledWith(
      expect.objectContaining({
        alertIds: ['alert-1'],
        index: 'my-index',
        from: 0,
        size: mockPagination.pageSize,
        sort: mockSortConfig,
      })
    );
  });

  it('computes from as pageIndex * pageSize', () => {
    vi.mocked(usePagination).mockReturnValue({
      pagination: { pageIndex: 2, pageSize: 10 },
      setPagination: mockSetPagination,
      pageSizeOptions: [5, 10, 20],
    });

    renderHook(() => usePaginatedAlerts(['alert-1']));

    expect(vi.mocked(useFetchAlerts)).toHaveBeenCalledWith(
      expect.objectContaining({ from: 20, size: 10 })
    );
  });

  it('includes totalItemCount in paginationConfig', () => {
    vi.mocked(useFetchAlerts).mockReturnValue({
      data: [],
      totalItemCount: 42,
      loading: false,
      error: false,
    });

    const { result } = renderHook(() => usePaginatedAlerts(['alert-1']));

    expect(result.current.paginationConfig.totalItemCount).toBe(42);
  });
});
