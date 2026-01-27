/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCloudPostureDataTable } from './use_cloud_posture_data_table';
import { useUrlQuery } from '../use_url_query';
import { usePageSize } from '../use_page_size';
import { usePersistedQuery } from './use_persisted_query';
import { useBaseEsQuery } from './use_base_es_query';

jest.mock('../use_url_query');
jest.mock('../use_page_size');
jest.mock('./use_persisted_query');
jest.mock('./use_base_es_query');

const mockUseUrlQuery = useUrlQuery as jest.MockedFunction<typeof useUrlQuery>;
const mockUsePageSize = usePageSize as jest.MockedFunction<typeof usePageSize>;
const mockUsePersistedQuery = usePersistedQuery as jest.MockedFunction<typeof usePersistedQuery>;
const mockUseBaseEsQuery = useBaseEsQuery as jest.MockedFunction<typeof useBaseEsQuery>;

describe('useCloudPostureDataTable - onSort', () => {
  const mockSetUrlQuery = jest.fn();
  const mockSetPageSize = jest.fn();
  const mockGetPersistedDefaultQuery = jest.fn(() => ({
    query: { query: '', language: 'kuery' },
    filters: [],
    sort: [['@timestamp', 'desc']],
    pageIndex: 0,
  }));

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePersistedQuery.mockReturnValue(mockGetPersistedDefaultQuery);
    mockUsePageSize.mockReturnValue({
      pageSize: 10,
      setPageSize: mockSetPageSize,
    });
    mockUseBaseEsQuery.mockReturnValue({
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: [],
        },
      },
    });
  });

  describe('when current sort is default [@timestamp, desc]', () => {
    beforeEach(() => {
      mockUseUrlQuery.mockReturnValue({
        urlQuery: {
          query: { query: '', language: 'kuery' },
          filters: [],
          sort: [['@timestamp', 'desc']],
          pageIndex: 0,
        },
        setUrlQuery: mockSetUrlQuery,
        key: 'test-key',
      });
    });

    it('should remove @timestamp when user adds another field to create multi-sort', () => {
      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([
          ['@timestamp', 'desc'],
          ['resource.name', 'asc'],
        ]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [['resource.name', 'asc']],
      });
    });

    it('should remove @timestamp when user adds multiple fields including @timestamp', () => {
      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([
          ['@timestamp', 'desc'],
          ['resource.name', 'asc'],
          ['resource.id', 'desc'],
        ]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [
          ['resource.name', 'asc'],
          ['resource.id', 'desc'],
        ],
      });
    });

    it('should keep @timestamp when user changes to single field sort (different field)', () => {
      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([['resource.name', 'asc']]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [['resource.name', 'asc']],
      });
    });

    it('should keep @timestamp when user changes direction but keeps single field', () => {
      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([['@timestamp', 'asc']]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [['@timestamp', 'asc']],
      });
    });
  });

  describe('when current sort is NOT default', () => {
    beforeEach(() => {
      mockUseUrlQuery.mockReturnValue({
        urlQuery: {
          query: { query: '', language: 'kuery' },
          filters: [],
          sort: [['resource.name', 'asc']],
          pageIndex: 0,
        },
        setUrlQuery: mockSetUrlQuery,
        key: 'test-key',
      });
    });

    it('should keep @timestamp when user explicitly adds it with another field', () => {
      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([
          ['resource.name', 'asc'],
          ['@timestamp', 'desc'],
        ]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [
          ['resource.name', 'asc'],
          ['@timestamp', 'desc'],
        ],
      });
    });

    it('should keep all fields when user adds multiple fields', () => {
      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([
          ['resource.name', 'asc'],
          ['resource.id', 'desc'],
          ['@timestamp', 'desc'],
        ]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [
          ['resource.name', 'asc'],
          ['resource.id', 'desc'],
          ['@timestamp', 'desc'],
        ],
      });
    });
  });

  describe('edge cases', () => {
    it('should handle undefined sort gracefully', () => {
      mockUseUrlQuery.mockReturnValue({
        urlQuery: {
          query: { query: '', language: 'kuery' },
          filters: [],
          sort: undefined,
          pageIndex: 0,
        },
        setUrlQuery: mockSetUrlQuery,
        key: 'test-key',
      });

      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([['resource.name', 'asc']]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [['resource.name', 'asc']],
      });
    });

    it('should handle empty sort array', () => {
      mockUseUrlQuery.mockReturnValue({
        urlQuery: {
          query: { query: '', language: 'kuery' },
          filters: [],
          sort: [],
          pageIndex: 0,
        },
        setUrlQuery: mockSetUrlQuery,
        key: 'test-key',
      });

      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([['resource.name', 'asc']]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [['resource.name', 'asc']],
      });
    });

    it('should handle sort with @timestamp in different position', () => {
      mockUseUrlQuery.mockReturnValue({
        urlQuery: {
          query: { query: '', language: 'kuery' },
          filters: [],
          sort: [['@timestamp', 'desc']],
          pageIndex: 0,
        },
        setUrlQuery: mockSetUrlQuery,
        key: 'test-key',
      });

      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      // @timestamp in second position
      act(() => {
        result.current.onSort([
          ['resource.name', 'asc'],
          ['@timestamp', 'desc'],
        ]);
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [['resource.name', 'asc']],
      });
    });

    it('should handle non-default @timestamp sort (asc direction)', () => {
      mockUseUrlQuery.mockReturnValue({
        urlQuery: {
          query: { query: '', language: 'kuery' },
          filters: [],
          sort: [['@timestamp', 'asc']], // Not the default (desc)
          pageIndex: 0,
        },
        setUrlQuery: mockSetUrlQuery,
        key: 'test-key',
      });

      const { result } = renderHook(() =>
        useCloudPostureDataTable({
          paginationLocalStorageKey: 'test-key',
        })
      );

      act(() => {
        result.current.onSort([
          ['@timestamp', 'asc'],
          ['resource.name', 'desc'],
        ]);
      });

      // Should keep @timestamp because it's not the default (desc)
      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        sort: [
          ['@timestamp', 'asc'],
          ['resource.name', 'desc'],
        ],
      });
    });
  });
});
