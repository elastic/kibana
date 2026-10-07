/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useIntegrations } from './use_integrations';
import { useKibana } from '../../common/lib/kibana';
import { INSTALLATION_STATUS, THREAT_INTELLIGENCE_CATEGORY } from '../utils/filter_integrations';

jest.mock('../../common/lib/kibana');

const INTEGRATIONS_CALL_TIMEOUT = 2000;

const installedIntegration = {
  categories: [THREAT_INTELLIGENCE_CATEGORY],
  id: '123',
  status: INSTALLATION_STATUS.Installed,
};

const createWrapper = (): FC<PropsWithChildren<{}>> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockHttpGet = jest.fn();

describe('useIntegrations', () => {
  beforeEach(() => {
    jest.mocked(useKibana).mockReturnValue({
      services: { http: { get: mockHttpGet } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should return the installed threat intelligence integrations', async () => {
    mockHttpGet.mockResolvedValue({ items: [installedIntegration] });

    const { result } = renderHook(() => useIntegrations({ enabled: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([installedIntegration]);
  });

  it('should stop loading once the call exceeds the timeout, to not block the indicators page', async () => {
    jest.useFakeTimers();
    mockHttpGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useIntegrations({ enabled: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(INTEGRATIONS_CALL_TIMEOUT);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should only start the timeout once the query is enabled', async () => {
    jest.useFakeTimers();
    mockHttpGet.mockReturnValue(new Promise(() => {}));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useIntegrations({ enabled }),
      { wrapper: createWrapper(), initialProps: { enabled: false } }
    );

    await act(async () => {
      jest.advanceTimersByTime(INTEGRATIONS_CALL_TIMEOUT);
    });

    expect(mockHttpGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);

    rerender({ enabled: true });

    await act(async () => {
      jest.advanceTimersByTime(INTEGRATIONS_CALL_TIMEOUT);
    });

    expect(result.current.isLoading).toBe(false);
  });
});
