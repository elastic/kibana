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
import { INSTALLATION_STATUS, THREAT_INTELLIGENCE_CATEGORY } from '../utils/filter_integrations';
import { useKibana } from '../../common/lib/kibana';
import { useIntegrations } from './use_integrations';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

const INTEGRATIONS_CALL_TIMEOUT = 2000;

const installedTIIntegration = {
  categories: [THREAT_INTELLIGENCE_CATEGORY],
  id: '123',
  status: INSTALLATION_STATUS.Installed,
};

const httpGet = jest.fn();

const createWrapper = (): FC<PropsWithChildren<{}>> => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderUseIntegrations = (enabled: boolean) =>
  renderHook(
    ({ enabled: isEnabled }: { enabled: boolean }) => useIntegrations({ enabled: isEnabled }),
    {
      wrapper: createWrapper(),
      initialProps: { enabled },
    }
  );

describe('useIntegrations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    httpGet.mockReset();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { get: httpGet } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should have undefined data during loading state', () => {
    httpGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderUseIntegrations(true);

    expect(result.current.isLoading).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('should return integrations on success', async () => {
    httpGet.mockResolvedValue({ items: [installedTIIntegration] });

    const { result } = renderUseIntegrations(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.data).toEqual([installedTIIntegration]);
  });

  it('should stop loading when the integrations call does not answer within the timeout', async () => {
    httpGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderUseIntegrations(true);

    expect(result.current.isLoading).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(INTEGRATIONS_CALL_TIMEOUT);
    });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.data).toBeUndefined();
  });

  it('should stop loading within the timeout even when the call starts well after the hook mounts', async () => {
    httpGet.mockReturnValue(new Promise(() => {}));

    const { result, rerender } = renderUseIntegrations(false);

    act(() => {
      jest.advanceTimersByTime(INTEGRATIONS_CALL_TIMEOUT);
    });

    rerender({ enabled: true });

    await waitFor(() => expect(httpGet).toHaveBeenCalledTimes(1));

    expect(result.current.isLoading).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(INTEGRATIONS_CALL_TIMEOUT);
    });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());
  });
});
