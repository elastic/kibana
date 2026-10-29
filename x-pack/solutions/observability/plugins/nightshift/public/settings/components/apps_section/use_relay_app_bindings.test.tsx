/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  formatChannelValue,
  useAllRelayAppBindings,
  useBindChannel,
} from './use_relay_app_bindings';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const httpGet = jest.fn();
const httpPost = jest.fn();
const addError = jest.fn();

const createSetup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const flush = (ms = 0) => act(() => jest.advanceTimersByTimeAsync(ms));

describe('useAllRelayAppBindings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { http: { get: httpGet }, notifications: { toasts: { addError } } },
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('follows the cursor and returns every connected channel sorted by label', async () => {
    httpGet
      .mockResolvedValueOnce({
        bindings: [
          { channel: 'C2', displayName: 'oncall', status: 'bound_to_self' },
          { status: 'bound_to_self' },
        ],
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        bindings: [{ channel: 'C1', displayName: 'alerts', status: 'bound_to_self' }],
      });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useAllRelayAppBindings(), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenNthCalledWith(
      2,
      '/internal/significant_events/apps/slack/bindings',
      expect.objectContaining({ query: { perPage: 200, cursor: 'cursor-2' } })
    );
    expect(result.current.bindings).toEqual([
      { channel: 'C1', displayName: 'alerts', status: 'bound_to_self' },
      { channel: 'C2', displayName: 'oncall', status: 'bound_to_self' },
    ]);
    expect(result.current.isComplete).toBe(true);
  });

  it('stops at the page bound and reports the list as incomplete', async () => {
    httpGet.mockResolvedValue({
      bindings: [{ channel: 'C1', status: 'bound_to_self' }],
      nextCursor: 'more',
    });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useAllRelayAppBindings(), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenCalledTimes(10);
    expect(result.current.isComplete).toBe(false);
  });
});

describe('formatChannelValue', () => {
  const bindings = [
    { channel: 'C1', displayName: 'alerts', status: 'bound_to_self' as const },
    { channel: 'G7', visibility: 'private' as const, status: 'bound_to_self' as const },
  ];

  it.each([
    ['C1', '#alerts'],
    ['G7', 'Private · G7'],
  ])('labels %s as %s', (value, label) => {
    expect(formatChannelValue(value, bindings)).toBe(label);
  });
});

describe('useBindChannel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: { get: httpGet, post: httpPost },
        notifications: { toasts: { addError } },
      },
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([['something_new', 'other']])(
    'exposes a %s rejection as the %s failure instead of a toast',
    async (sent, expected) => {
      httpPost.mockRejectedValue({
        body: {
          message: 'Elastic is not in this channel.',
          attributes: { data: { reason: sent } },
        },
      });
      const { wrapper } = createSetup();
      const { result } = renderHook(() => useBindChannel(), { wrapper });

      await act(async () => {
        await result.current.bind('C123').catch(() => {});
      });

      await flush();
      expect(result.current.failure).toEqual({
        reason: expected,
        message: 'Elastic is not in this channel.',
      });
      expect(addError).not.toHaveBeenCalled();

      act(() => result.current.clearFailure());
      await flush();
      expect(result.current.failure).toBeUndefined();
    }
  );
});
