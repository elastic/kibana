/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, HUNT_WORKER_INDEX_COVERAGE_URL } from '@kbn/alertzero-common';
import { useHuntWorkerIndexCoverage } from './use_hunt_worker_index_coverage';

const setup = (enabled: boolean) => {
  const core = coreMock.createStart();
  core.http.get.mockResolvedValue({ source: 'role' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  const hook = renderHook(() => useHuntWorkerIndexCoverage(enabled), { wrapper });
  return { core, hook };
};

describe('useHuntWorkerIndexCoverage', () => {
  it('fetches the coverage route when enabled', async () => {
    const { core, hook } = setup(true);
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(core.http.get).toHaveBeenCalledWith(HUNT_WORKER_INDEX_COVERAGE_URL, {
      version: API_VERSIONS.internal.v1,
    });
  });

  it('does not fetch while disabled', () => {
    const { core } = setup(false);
    expect(core.http.get).not.toHaveBeenCalled();
  });
});
