/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { EndpointScriptListApiResponse } from '../../../../common/endpoint/types';
import type { UseQueryResult } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { EndpointScriptsGenerator } from '../../../../common/endpoint/data_generators/endpoint_scripts_generator';
import { useWithScriptLibraryData } from './use_with_script_library_data';
import { useGetEndpointScriptsList } from './use_get_scripts_list';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';
import type {
  ScriptLibraryAllowedFileType,
  ScriptTagKey,
} from '../../../../common/endpoint/service/script_library/constants';

jest.mock('./use_get_scripts_list');
jest.mock('../../../common/components/user_privileges');

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const mockUseGetEndpointScriptsList = useGetEndpointScriptsList as jest.MockedFunction<
  typeof useGetEndpointScriptsList
>;

type MockUseQueryResult = UseQueryResult<
  EndpointScriptListApiResponse,
  IHttpFetchError<ResponseErrorBody>
>;

// Mock response data
const scriptGenerator = new EndpointScriptsGenerator();

const createMockScriptListResponse = (
  total: number = 10,
  overrides?: Partial<EndpointScriptListApiResponse>
): EndpointScriptListApiResponse => {
  const scripts = scriptGenerator.generateListOfScripts(
    Array.from({ length: Math.min(total, 1) }, (_, i) => ({
      name: `Script-${i}`,
    }))
  );

  return {
    data: scripts,
    page: 1,
    pageSize: 10,
    total,
    sortField: 'name',
    sortDirection: 'asc',
    ...overrides,
  };
};

describe('useWithScriptLibraryData', () => {
  let defaultGetEndpointScriptsListResponse: MockUseQueryResult;

  beforeEach(() => {
    jest.clearAllMocks();

    useUserPrivilegesMock.mockReturnValue({
      endpointPrivileges: getEndpointAuthzInitialStateMock(),
    });

    defaultGetEndpointScriptsListResponse = {
      data: createMockScriptListResponse(0),
      isFetching: false,
      isFetched: true,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isPending: false,
      isLoading: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      staleTime: 0,
      isStale: false,
    } as unknown as MockUseQueryResult;
  });

  describe('initialization and return values', () => {
    it('should initialize hook with default behavior', () => {
      const mockFilteredResponse = createMockScriptListResponse(5);
      const mockUnfilteredResponse = createMockScriptListResponse(10);

      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1 && queryParams.page === 1;

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? mockUnfilteredResponse : mockFilteredResponse,
        } as unknown as MockUseQueryResult;
      });

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
          sortField: 'name',
          sortDirection: 'asc',
        })
      );

      expect(result.current.doesDataExist).toBe(true);
      expect(result.current.data).toEqual(mockFilteredResponse);
      expect(result.current.isPageInitializing).toBe(false);
      expect(result.current.refetch).toBeDefined();
    });

    it('should return all properties from interface', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current).toMatchObject({
        doesDataExist: expect.any(Boolean),
        isPageInitializing: expect.any(Boolean),
        data: expect.anything(),
        isFetching: expect.any(Boolean),
        isFetched: expect.any(Boolean),
        error: null,
        refetch: expect.any(Function),
      });
    });

    it('should pass custom options to filtered query', () => {
      mockUseGetEndpointScriptsList.mockReturnValue({
        ...defaultGetEndpointScriptsListResponse,
        data: createMockScriptListResponse(1),
      } as unknown as MockUseQueryResult);

      const customOptions = {
        enabled: false,
        retry: false,
      };

      renderHook(() =>
        useWithScriptLibraryData(
          {
            page: 1,
            pageSize: 10,
          },
          customOptions
        )
      );

      const calls = mockUseGetEndpointScriptsList.mock.calls;
      // Find the filtered query call (pageSize !== 1)
      const filteredQueryCall = calls.find((call) => call[0].pageSize !== 1);

      expect(filteredQueryCall).toBeDefined();
      expect(filteredQueryCall![1]).toEqual(expect.objectContaining(customOptions));
    });
  });

  describe('unfiltered query behavior', () => {
    it('should call unfiltered query with {page: 1, pageSize: 1}', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      const unfilteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[0].pageSize === 1
      );

      expect(unfilteredCall).toBeDefined();
      expect(unfilteredCall![0]).toEqual({
        page: 1,
        pageSize: 1,
      });
    });

    it('should pass options to unfiltered query', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      const customOptions = { enabled: true };

      renderHook(() =>
        useWithScriptLibraryData(
          {
            page: 1,
            pageSize: 10,
          },
          customOptions
        )
      );

      const unfilteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[0].pageSize === 1
      );

      expect(unfilteredCall![1]).toEqual(
        expect.objectContaining({
          ...customOptions,
          refetchOnWindowFocus: false,
        })
      );
    });

    it('should always set refetchOnWindowFocus to false for unfiltered query', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      const unfilteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[0].pageSize === 1
      );

      expect(unfilteredCall![1]).toHaveProperty('refetchOnWindowFocus', false);
    });

    it('should determine doesDataExist based on unfiltered response total', () => {
      useUserPrivilegesMock.mockReturnValue({
        endpointPrivileges: {
          ...getEndpointAuthzInitialStateMock(),
          canWriteScriptsLibrary: false,
        },
      });
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );
      const unfilteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[0].pageSize === 1
      );
      expect(unfilteredCall).toBeDefined();
    });
  });

  describe('filtered query behavior', () => {
    it('should pass queryParams to filtered query', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      const queryParams = {
        page: 2,
        pageSize: 20,
        sortField: 'createdAt' as const,
        sortDirection: 'desc' as const,
        os: ['linux'] as SupportedHostOsType[],
        fileType: ['archive'] as ScriptLibraryAllowedFileType[],
        category: ['discovery'] as ScriptTagKey[],
        searchTerms: ['test search'],
      };

      renderHook(() => useWithScriptLibraryData(queryParams));

      const filteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[0].pageSize !== 1
      );

      expect(filteredCall![0]).toEqual(queryParams);
    });
  });

  describe('doesDataExist flag', () => {
    it('should be true when unfiltered response total > 0', () => {
      const mockUnfilteredResponse = createMockScriptListResponse(5);

      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1;

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? mockUnfilteredResponse : [],
        } as unknown as MockUseQueryResult;
      });

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current.doesDataExist).toBe(true);
    });

    it('should be false when unfiltered response total === 0', () => {
      mockUseGetEndpointScriptsList.mockReturnValue({
        ...defaultGetEndpointScriptsListResponse,
        data: [],
      } as unknown as MockUseQueryResult);

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current.doesDataExist).toBe(false);
    });

    it('should default to false when unfiltered data is `undefined`', () => {
      mockUseGetEndpointScriptsList.mockReturnValue({
        ...defaultGetEndpointScriptsListResponse,
        data: undefined,
        isFetching: true,
        isFetched: false,
        isLoading: true,
        isSuccess: false,
        status: 'loading',
        fetchStatus: 'fetching',
      } as unknown as MockUseQueryResult);

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current.doesDataExist).toBe(false);
    });
  });

  describe('refetch synch', () => {
    it('should refetch when list data becomes empty and not loading', async () => {
      const mockRefetchFiltered = jest.fn();
      let filteredTotal: number = 1;

      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1;
        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered
            ? createMockScriptListResponse(5)
            : createMockScriptListResponse(filteredTotal),
          refetch: mockRefetchFiltered,
        } as unknown as MockUseQueryResult;
      });

      const { rerender } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      act(() => {
        filteredTotal = 0;
      });

      rerender();

      await waitFor(() => {
        expect(mockRefetchFiltered).toHaveBeenCalled();
      });
    });

    it('should NOT refetch when filters are active and list becomes empty', async () => {
      const mockRefetchFiltered = jest.fn();

      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1;
        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? createMockScriptListResponse(5) : createMockScriptListResponse(0),
          refetch: mockRefetchFiltered,
        } as unknown as MockUseQueryResult;
      });

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
          os: ['windows'] as SupportedHostOsType[],
          fileType: ['archive'] as ScriptLibraryAllowedFileType[],
          category: ['discovery'] as ScriptTagKey[],
          searchTerms: ['test'],
        })
      );

      await waitFor(() => {
        expect(mockRefetchFiltered).not.toHaveBeenCalled();
      });
    });

    it('should refetch when not on page 1 and list becomes empty', async () => {
      const mockRefetchFiltered = jest.fn();

      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1;
        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? createMockScriptListResponse(5) : createMockScriptListResponse(0),
          refetch: mockRefetchFiltered,
        } as unknown as MockUseQueryResult;
      });

      renderHook(() =>
        useWithScriptLibraryData({
          page: 2,
          pageSize: 10,
        })
      );

      await waitFor(() => {
        expect(mockRefetchFiltered).toHaveBeenCalled();
      });
    });

    it('should NOT refetch when list data is not empty', async () => {
      const mockRefetchFiltered = jest.fn();

      mockUseGetEndpointScriptsList.mockReturnValue({
        ...defaultGetEndpointScriptsListResponse,
        data: createMockScriptListResponse(5),
        refetch: mockRefetchFiltered,
      } as unknown as MockUseQueryResult);

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      await waitFor(() => {
        expect(mockRefetchFiltered).not.toHaveBeenCalled();
      });
    });

    it('should fetch when list has data after first being empty', async () => {
      const mockRefetchFiltered = jest.fn();
      let filteredTotal: number = 0;

      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1;
        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered
            ? createMockScriptListResponse(5)
            : createMockScriptListResponse(filteredTotal),
          refetch: mockRefetchFiltered,
        } as unknown as MockUseQueryResult;
      });

      const { rerender } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      act(() => {
        filteredTotal = 5;
      });

      rerender();

      await waitFor(() => {
        expect(mockRefetchFiltered).toHaveBeenCalled();
      });
    });
  });

  describe('error and loading states', () => {
    it('should handle errors from filtered query without crashing', () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
        body: {
          message: 'Test error',
        },
      };

      mockUseGetEndpointScriptsList.mockImplementation(() => {
        return {
          ...defaultGetEndpointScriptsListResponse,
          data: undefined,
          error: mockError,
          isError: true,
          status: 'error',
        } as unknown as MockUseQueryResult;
      });

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current.error).toEqual(mockError);
      expect(result.current.doesDataExist).toBe(false);
    });

    it('should work correctly when filtered query is in loading state', () => {
      mockUseGetEndpointScriptsList.mockImplementation((queryParams) => {
        const isUnfiltered = queryParams.pageSize === 1;
        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? createMockScriptListResponse(5) : undefined,
          isFetching: !isUnfiltered,
          isFetched: isUnfiltered,
          isPending: !isUnfiltered,
          isLoading: !isUnfiltered,
          isSuccess: isUnfiltered,
          status: isUnfiltered ? 'success' : 'pending',
          fetchStatus: isUnfiltered ? 'idle' : 'fetching',
        } as unknown as MockUseQueryResult;
      });

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current.doesDataExist).toBe(true);
      expect(result.current.isPageInitializing).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
