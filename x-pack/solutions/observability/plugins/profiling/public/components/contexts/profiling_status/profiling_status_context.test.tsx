/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ProfilingStatus } from '@kbn/profiling-utils';
import { AsyncStatus } from '../../../hooks/use_async';
import type { ProfilingDependencies } from '../profiling_dependencies/profiling_dependencies_context';
import { ProfilingDependenciesContextProvider } from '../profiling_dependencies/profiling_dependencies_context';
import { ProfilingStatusContextProvider } from './profiling_status_context';
import { useProfilingStatus } from './use_profiling_status';

const profilingStatus: ProfilingStatus = {
  isEnabled: true,
  otel: { isAvailable: true, hasData: true },
  universalProfiling: {
    isAvailable: true,
    hasSetup: false,
    hasData: false,
    hasLegacyData: false,
    canSetup: true,
  },
};

describe('ProfilingStatusContextProvider', () => {
  const fetchProfilingStatus = jest.fn();

  const dependencies = {
    start: {
      core: {
        http: { get: jest.fn() },
        notifications: { toasts: { addWarning: jest.fn() } },
      },
    },
    services: { fetchProfilingStatus },
  } as unknown as ProfilingDependencies;

  const Wrapper = ({ children }: React.PropsWithChildren) => (
    <ProfilingDependenciesContextProvider value={dependencies}>
      <ProfilingStatusContextProvider>
        <>{children}</>
      </ProfilingStatusContextProvider>
    </ProfilingDependenciesContextProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    fetchProfilingStatus.mockResolvedValue(profilingStatus);
  });

  it('fetches the profiling status once and shares it', async () => {
    const { result } = renderHook(() => useProfilingStatus(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).toBe(AsyncStatus.Settled));

    expect(result.current.data).toEqual(profilingStatus);
    expect(fetchProfilingStatus).toHaveBeenCalledTimes(1);
  });

  it('fetches the status again on refresh', async () => {
    const { result } = renderHook(() => useProfilingStatus(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe(AsyncStatus.Settled));

    act(() => result.current.refresh());

    await waitFor(() => expect(fetchProfilingStatus).toHaveBeenCalledTimes(2));
  });

  it('throws when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useProfilingStatus())).toThrow(
      'ProfilingStatusContext not found'
    );
  });
});
