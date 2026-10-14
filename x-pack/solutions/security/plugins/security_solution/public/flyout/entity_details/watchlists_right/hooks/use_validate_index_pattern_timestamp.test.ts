/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useValidateIndexPatternTimestamp } from './use_validate_index_pattern_timestamp';

const mockGetFieldsForWildcard = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      data: {
        dataViews: {
          getFieldsForWildcard: mockGetFieldsForWildcard,
        },
      },
    },
  }),
}));

const { QueryClient, QueryClientProvider } = jest.requireActual('@kbn/react-query');
const React = jest.requireActual('react');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

describe('useValidateIndexPatternTimestamp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined and does not fetch when no patterns are selected', () => {
    const { result } = renderHook(() => useValidateIndexPatternTimestamp([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasTimestamp).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockGetFieldsForWildcard).not.toHaveBeenCalled();
  });

  it('returns true when @timestamp date field is present', async () => {
    mockGetFieldsForWildcard.mockResolvedValue([{ name: '@timestamp', type: 'date' }]);

    const { result } = renderHook(() => useValidateIndexPatternTimestamp([{ label: 'logs-*' }]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasTimestamp).toBe(true);
    expect(mockGetFieldsForWildcard).toHaveBeenCalledWith({
      pattern: 'logs-*',
      fields: ['@timestamp'],
    });
  });

  it('returns false when no @timestamp field is returned', async () => {
    mockGetFieldsForWildcard.mockResolvedValue([]);

    const { result } = renderHook(
      () => useValidateIndexPatternTimestamp([{ label: 'metrics-*' }]),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasTimestamp).toBe(false);
  });

  it('returns false when @timestamp exists but is not a date type', async () => {
    mockGetFieldsForWildcard.mockResolvedValue([{ name: '@timestamp', type: 'keyword' }]);

    const { result } = renderHook(() => useValidateIndexPatternTimestamp([{ label: 'logs-*' }]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasTimestamp).toBe(false);
  });

  it('returns true when all patterns have @timestamp', async () => {
    mockGetFieldsForWildcard.mockResolvedValue([{ name: '@timestamp', type: 'date' }]);

    const { result } = renderHook(
      () => useValidateIndexPatternTimestamp([{ label: 'logs-*' }, { label: 'metrics-*' }]),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasTimestamp).toBe(true);
    expect(mockGetFieldsForWildcard).toHaveBeenCalledTimes(2);
    expect(mockGetFieldsForWildcard).toHaveBeenCalledWith({
      pattern: 'logs-*',
      fields: ['@timestamp'],
    });
    expect(mockGetFieldsForWildcard).toHaveBeenCalledWith({
      pattern: 'metrics-*',
      fields: ['@timestamp'],
    });
  });

  it('returns false when only some patterns have @timestamp', async () => {
    mockGetFieldsForWildcard.mockImplementation(({ pattern }: { pattern: string }) =>
      Promise.resolve(pattern === 'logs-*' ? [{ name: '@timestamp', type: 'date' }] : [])
    );

    const { result } = renderHook(
      () => useValidateIndexPatternTimestamp([{ label: 'logs-*' }, { label: 'no-timestamp-*' }]),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasTimestamp).toBe(false);
  });
});
