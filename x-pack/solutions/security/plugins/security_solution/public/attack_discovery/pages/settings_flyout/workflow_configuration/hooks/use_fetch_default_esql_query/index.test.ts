/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { useKibana } from '../../../../../../common/lib/kibana';
import { useFetchDefaultEsqlQuery } from '.';

jest.mock('../../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const DEFAULT_QUERY = 'FROM .alerts-security.alerts-default | LIMIT 100';

describe('useFetchDefaultEsqlQuery', () => {
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        http: {
          get: mockGet,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('returns undefined defaultEsqlQuery initially', () => {
    const { result } = renderHook(() => useFetchDefaultEsqlQuery());

    expect(result.current.defaultEsqlQuery).toBeUndefined();
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches default query on first invocation', async () => {
    mockGet.mockResolvedValue({ query: DEFAULT_QUERY });

    const { result } = renderHook(() => useFetchDefaultEsqlQuery());

    let fetchedQuery: string | undefined;

    await act(async () => {
      fetchedQuery = await result.current.fetchDefaultEsqlQuery();
    });

    expect(fetchedQuery).toBe(DEFAULT_QUERY);
    expect(result.current.defaultEsqlQuery).toBe(DEFAULT_QUERY);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      '/internal/attack_discovery/attack_discovery/queries/esql/default',
      { version: '1' }
    );
  });

  it('returns cached query on subsequent invocations without re-fetching', async () => {
    mockGet.mockResolvedValue({ query: DEFAULT_QUERY });

    const { result } = renderHook(() => useFetchDefaultEsqlQuery());

    await act(async () => {
      await result.current.fetchDefaultEsqlQuery();
    });

    let secondResult: string | undefined;

    await act(async () => {
      secondResult = await result.current.fetchDefaultEsqlQuery();
    });

    expect(secondResult).toBe(DEFAULT_QUERY);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('sets isError to true on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFetchDefaultEsqlQuery());

    let fetchedQuery: string | undefined;

    await act(async () => {
      fetchedQuery = await result.current.fetchDefaultEsqlQuery();
    });

    expect(fetchedQuery).toBeUndefined();
    expect(result.current.defaultEsqlQuery).toBeUndefined();
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('triggers a fresh API call after resetCache is called', async () => {
    const UPDATED_QUERY = 'FROM .alerts-security.alerts-default | LIMIT 200';
    mockGet.mockResolvedValueOnce({ query: DEFAULT_QUERY });

    const { result } = renderHook(() => useFetchDefaultEsqlQuery());

    await act(async () => {
      await result.current.fetchDefaultEsqlQuery();
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.defaultEsqlQuery).toBe(DEFAULT_QUERY);

    act(() => {
      result.current.resetCache();
    });

    expect(result.current.defaultEsqlQuery).toBeUndefined();

    mockGet.mockResolvedValueOnce({ query: UPDATED_QUERY });

    let freshQuery: string | undefined;

    await act(async () => {
      freshQuery = await result.current.fetchDefaultEsqlQuery();
    });

    expect(freshQuery).toBe(UPDATED_QUERY);
    expect(result.current.defaultEsqlQuery).toBe(UPDATED_QUERY);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when http is not available', async () => {
    mockUseKibana.mockReturnValue({
      services: {},
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useFetchDefaultEsqlQuery());

    let fetchedQuery: string | undefined;

    await act(async () => {
      fetchedQuery = await result.current.fetchDefaultEsqlQuery();
    });

    expect(fetchedQuery).toBeUndefined();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
