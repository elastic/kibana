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
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
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

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const ATTACK_DISCOVERY = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const workerIds = [TRIAGE, ATTACK_DISCOVERY];
const enabledMap = Object.fromEntries(workerIds.map((id) => [id, true]));

const cached = {
  workers: workerIds.map((id) => ({
    id,
    enabled: false,
    settings: {},
    settingsRevision: 1,
    blockingReasons: [] as WorkerBlockingReason[],
  })),
} as unknown as ListWorkersResponse;

const failedPatch = (message: string) =>
  Object.assign(new Error(''), {
    name: 'Error',
    request: {},
    response: { status: 400, statusText: '' },
    body: { message },
  });

describe('useEnableWorkers error toasts', () => {
  beforeEach(() => {
    mockEnsureWorkerServiceAccounts.mockReset();
    mockEnsureWorkerServiceAccounts.mockResolvedValue(
      new Map(workerIds.map((id) => [id, { ok: true, serviceAccountId: `account-${id}` }]))
    );
  });

  it('shows one toast per failed Worker, each naming the Worker and its own reason', async () => {
    const coreStart = coreMock.createStart();
    const patch = jest.fn((url: string) =>
      Promise.reject(
        failedPatch(String(url).includes(TRIAGE) ? 'No AI model is available.' : 'Quota exceeded.')
      )
    );
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

    const { result } = renderHook(
      () => useEnableWorkers(workerIds, enabledMap, undefined, undefined),
      { wrapper }
    );
    await act(async () => {
      await result.current.handleEnableAndContinue();
    });

    const { addError } = core.notifications.toasts;
    expect(patch).toHaveBeenCalledTimes(2);
    expect(addError).toHaveBeenCalledTimes(2);
    expect(addError.mock.calls.map(([, options]) => options)).toEqual([
      { title: 'Unable to update Alert Triage', toastMessage: 'No AI model is available.' },
      { title: 'Unable to update Attack Discovery', toastMessage: 'Quota exceeded.' },
    ]);
  });
});
