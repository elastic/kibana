/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  type ListWorkersResponse,
  type WorkerBlockingReason,
} from '@kbn/alertzero-common';
import { queryKeys } from '../../query_keys';
import { useEnableWorkers } from './use_enable_workers';

const mockEnsureWorkerServiceAccounts = jest.fn();
jest.mock('../../service_accounts/ensure_worker_service_accounts', () => ({
  ensureWorkerServiceAccounts: (...args: unknown[]) =>
    mockEnsureWorkerServiceAccounts(
      ...(args as Parameters<typeof mockEnsureWorkerServiceAccounts>)
    ),
}));

const workerIds = SYSTEM_SECURITY_WORKER_CATALOG.map(({ id }) => id);
const enabledMap = Object.fromEntries(workerIds.map((id) => [id, true]));

/** A workers list where each override replaces the default off/no-account state. */
const workersResponse = (
  overrides: Record<string, { enabled?: boolean; accountId?: string | null }> = {}
) =>
  ({
    workers: workerIds.map((id) => {
      const override = overrides[id] ?? {};
      return {
        id,
        enabled: override.enabled ?? false,
        settings: override.accountId ? { serviceAccountId: override.accountId } : {},
        settingsRevision: 1,
        blockingReasons: [] as WorkerBlockingReason[],
      };
    }),
  } as ListWorkersResponse);

const patch = jest.fn();

const setup = ({ cached }: { cached: ListWorkersResponse }) => {
  const coreStart = coreMock.createStart();
  const core = {
    ...coreStart,
    http: { ...coreStart.http, patch, get: jest.fn().mockResolvedValue(cached) },
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.workers.list(), cached);
  const wrapper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
};

/** Account setup result map: `failedIds` entries are not ok. */
const accounts = (ids: string[], failedIds: string[] = []) =>
  new Map(
    ids.map((id) => [
      id,
      failedIds.includes(id)
        ? { ok: false, error: 'account setup failed' }
        : { ok: true, serviceAccountId: `account-${id}` },
    ])
  );

describe('useEnableWorkers', () => {
  beforeEach(() => {
    patch.mockReset();
    patch.mockResolvedValue({});
    mockEnsureWorkerServiceAccounts.mockReset();
  });

  it('PATCHes every selected worker when nothing is enabled yet', async () => {
    mockEnsureWorkerServiceAccounts.mockResolvedValue(accounts(workerIds));
    const { wrapper } = setup({ cached: workersResponse() });

    const { result } = renderHook(
      () => useEnableWorkers(workerIds, enabledMap, undefined, undefined),
      { wrapper }
    );
    await act(async () => {
      await result.current.handleEnableAndContinue();
    });

    expect(patch).toHaveBeenCalledTimes(workerIds.length);
  });

  it('on retry after a partial save, PATCHes only the worker that did not land', async () => {
    const [failedId, ...landedIds] = workerIds;

    // Press 1: every worker is off; the failed one's account setup also fails.
    const landed = Object.fromEntries(
      landedIds.map((id) => [id, { enabled: true, accountId: `account-${id}` }])
    );
    mockEnsureWorkerServiceAccounts.mockResolvedValue(accounts(workerIds, [failedId]));
    const first = setup({ cached: workersResponse() });

    const firstHook = renderHook(
      () => useEnableWorkers(workerIds, enabledMap, undefined, undefined),
      { wrapper: first.wrapper }
    );
    await act(async () => {
      await firstHook.result.current.handleEnableAndContinue();
    });

    const pressOneUrls = patch.mock.calls.map(([url]) => String(url));
    expect(pressOneUrls).not.toContainEqual(expect.stringContaining(failedId));
    expect(patch).toHaveBeenCalledTimes(workerIds.length - 1);

    // The refetch between presses reports the landed workers as on with accounts.
    first.queryClient.setQueryData(queryKeys.workers.list(), workersResponse({ ...landed }));

    patch.mockClear();
    mockEnsureWorkerServiceAccounts.mockResolvedValue(accounts([failedId]));
    const second = setup({
      cached: workersResponse({ ...landed }),
    });

    const secondHook = renderHook(
      () => useEnableWorkers(workerIds, enabledMap, undefined, undefined),
      { wrapper: second.wrapper }
    );
    await act(async () => {
      await secondHook.result.current.handleEnableAndContinue();
    });

    expect(patch).toHaveBeenCalledTimes(1);
    expect(String(patch.mock.calls[0][0])).toContain(failedId);
  });
});
