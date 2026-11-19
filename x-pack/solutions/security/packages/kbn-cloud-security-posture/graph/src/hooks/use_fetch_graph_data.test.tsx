/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchGraphData } from './use_fetch_graph_data';
import { GraphFetchError } from './graph_fetch_error';

const mockUseQuery = jest.fn((...args: unknown[]) => ({
  isLoading: true,
  data: null,
  isError: false,
  isFetching: true,
}));

jest.mock('@kbn/react-query', () => {
  return {
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useQueryClient: jest.fn(),
  };
});

jest.mock('@kbn/kibana-react-plugin/public');

const mockHttpPost = jest.fn();

const defaultOptions = {
  enabled: true,
  refetchOnWindowFocus: true,
  keepPreviousData: false,
};

describe('useFetchGraphData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { post: mockHttpPost } } });
  });

  it('should pass default options when options are not provided', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            originEventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      ...defaultOptions,
    });
  });

  it('should not be enabled when enabled set to false', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            originEventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
        options: {
          enabled: false,
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      ...defaultOptions,
      enabled: false,
    });
  });

  it('should not be refetchOnWindowFocus when refetchOnWindowFocus set to false', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            originEventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
        options: {
          refetchOnWindowFocus: false,
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      ...defaultOptions,
      refetchOnWindowFocus: false,
    });
  });

  it('should keepPreviousData when keepPreviousData set to true', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            originEventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
        options: {
          keepPreviousData: true,
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      ...defaultOptions,
      keepPreviousData: true,
    });
  });

  describe('when the request fails', () => {
    const renderAndGetQueryFn = () => {
      renderHook(() =>
        useFetchGraphData({
          req: {
            query: {
              originEventIds: [],
              start: '2021-09-01T00:00:00.000Z',
              end: '2021-09-01T23:59:59.999Z',
            },
          },
        })
      );
      return mockUseQuery.mock.calls[0][1] as () => Promise<unknown>;
    };

    it('throws a GraphFetchError with the response message and HTTP status', async () => {
      mockHttpPost.mockRejectedValue({
        message: 'Service Unavailable',
        body: { message: 'ES is down' },
        response: { status: 503 },
      });

      const error = await renderAndGetQueryFn()().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(GraphFetchError);
      expect(error).toMatchObject({ message: 'ES is down', statusCode: 503 });
    });

    it('falls back to the error message and the body status code', async () => {
      mockHttpPost.mockRejectedValue({
        message: 'Bad Request',
        body: { statusCode: 400 },
      });

      const error = await renderAndGetQueryFn()().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(GraphFetchError);
      expect(error).toMatchObject({ message: 'Bad Request', statusCode: 400 });
    });

    it('throws a GraphFetchError without a status code when there was no response', async () => {
      mockHttpPost.mockRejectedValue(new TypeError('Failed to fetch'));

      const error = await renderAndGetQueryFn()().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(GraphFetchError);
      expect(error).toMatchObject({ message: 'Failed to fetch', statusCode: undefined });
    });
  });
});
