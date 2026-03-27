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
      data: [] as unknown as EndpointScriptListApiResponse,
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

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

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
      const filteredQueryCall = calls.find((call) => !call[2]);

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
        (call) => call[2]?.[0] === 'script-library-has-data'
      );

      expect(unfilteredCall).toBeDefined();
      expect(unfilteredCall![0]).toEqual({
        page: 1,
        pageSize: 1,
      });
    });

    it('should use custom queryKey "script-library-has-data"', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      const unfilteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[2]?.[0] === 'script-library-has-data'
      );

      expect(unfilteredCall![2]).toEqual(['script-library-has-data']);
    });

    it('should have correct query options for unfiltered query', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      renderHook(() =>
        useWithScriptLibraryData(
          {
            page: 1,
            pageSize: 10,
          },
          {
            enabled: true,
          }
        )
      );

      const unfilteredCall = mockUseGetEndpointScriptsList.mock.calls.find(
        (call) => call[2]?.[0] === 'script-library-has-data'
      );

      expect(unfilteredCall![1]).toEqual(
        expect.objectContaining({
          enabled: true,
          refetchOnWindowFocus: false,
        })
      );
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
        (call) => call[2]?.[0] === 'script-library-has-data'
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

      const filteredCall = mockUseGetEndpointScriptsList.mock.calls.find((call) => !call[2]);

      expect(filteredCall![0]).toEqual(queryParams);
    });

    it('should use default queryKey for filtered query', () => {
      mockUseGetEndpointScriptsList.mockReturnValue(defaultGetEndpointScriptsListResponse);

      renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      const filteredCall = mockUseGetEndpointScriptsList.mock.calls.find((call) => !call[2]);

      expect(filteredCall![2]).toBeUndefined();
    });
  });

  describe('doesDataExist flag', () => {
    it('should be true when unfiltered response total > 0', () => {
      const mockUnfilteredResponse = createMockScriptListResponse(5);

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

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
    it('should refetch when last item is deleted (listData.total becomes 0)', async () => {
      const mockRefetchHasData = jest.fn();
      const mockRefetchFiltered = jest.fn();
      const unfilteredTotal = 5;
      let filteredTotal: number = 1;

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered
            ? createMockScriptListResponse(unfilteredTotal)
            : createMockScriptListResponse(filteredTotal),
          refetch: isUnfiltered ? mockRefetchHasData : mockRefetchFiltered,
        } as unknown as MockUseQueryResult;
      });

      const { rerender } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      // Initial state: refetch should not have been called
      expect(mockRefetchHasData).not.toHaveBeenCalled();

      act(() => {
        filteredTotal = 0;
      });

      rerender();

      await waitFor(() => {
        expect(mockRefetchHasData).toHaveBeenCalled();
      });
    });

    it('should NOT refetch when filters are active (filter params are not empty)', async () => {
      const mockRefetchHasData = jest.fn();

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? createMockScriptListResponse(5) : [],
          refetch: mockRefetchHasData,
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
        expect(mockRefetchHasData).not.toHaveBeenCalled();
      });
    });

    it('should NOT refetch when not on page 1', async () => {
      const mockRefetchHasData = jest.fn();

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? createMockScriptListResponse(5) : [],
          refetch: mockRefetchHasData,
        } as unknown as MockUseQueryResult;
      });

      renderHook(() =>
        useWithScriptLibraryData({
          page: 2,
          pageSize: 10,
        })
      );

      await waitFor(() => {
        expect(mockRefetchHasData).not.toHaveBeenCalled();
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

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: undefined,
          error: isUnfiltered ? null : mockError,
          isError: !isUnfiltered,
          status: isUnfiltered ? 'success' : 'error',
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

    it('should work correctly when unfiltered query is in loading state', () => {
      const mockRefetchHasData = jest.fn();

      mockUseGetEndpointScriptsList.mockImplementation((_queryParams, _options, queryKey) => {
        const isUnfiltered = queryKey && queryKey[0] === 'script-library-has-data';

        return {
          ...defaultGetEndpointScriptsListResponse,
          data: isUnfiltered ? undefined : createMockScriptListResponse(5),
          isFetching: isUnfiltered,
          isFetched: !isUnfiltered,
          refetch: mockRefetchHasData,
          isPending: isUnfiltered,
          isLoading: isUnfiltered,
          isSuccess: !isUnfiltered,
          status: isUnfiltered ? 'pending' : 'success',
          fetchStatus: isUnfiltered ? 'fetching' : 'idle',
        } as unknown as MockUseQueryResult;
      });

      const { result } = renderHook(() =>
        useWithScriptLibraryData({
          page: 1,
          pageSize: 10,
        })
      );

      expect(result.current.doesDataExist).toBe(false);
      expect(result.current.isPageInitializing).toBe(true);
      expect(result.current.data?.total).toBe(5);
    });
  });
});
