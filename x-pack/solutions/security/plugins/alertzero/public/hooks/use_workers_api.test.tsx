/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { queryKeys } from '../query_keys';
import { notifyWorkerUpdateError, useUpdateWorker } from './use_workers_api';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

const httpError = (status: number): Error =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'Error',
    request: {},
    response: { status },
  });

const createWorker = (overrides: Partial<Worker> = {}): Worker => ({
  id: TRIAGE,
  name: 'Alert Triage',
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
  enabled: false,
  lastRun: null,
  state: 'paused',
  settingsRevision: 1,
  settings: {
    workerId: TRIAGE,
    autonomy: 'manual',
  },
  ...overrides,
});

describe('notifyWorkerUpdateError', () => {
  const toasts = coreMock.createStart().notifications.toasts;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns on 409 without a stack toast', () => {
    notifyWorkerUpdateError(toasts, httpError(409));

    expect(toasts.addWarning).toHaveBeenCalledWith('Worker settings changed; reload and try again');
    expect(toasts.addDanger).not.toHaveBeenCalled();
    expect(toasts.addError).not.toHaveBeenCalled();
  });

  it('uses danger on 403 without a stack toast', () => {
    notifyWorkerUpdateError(toasts, httpError(403));

    expect(toasts.addDanger).toHaveBeenCalledWith(
      'You do not have permission to update this worker'
    );
    expect(toasts.addWarning).not.toHaveBeenCalled();
    expect(toasts.addError).not.toHaveBeenCalled();
  });

  it('keeps addError for unexpected failures', () => {
    const error = httpError(500);
    notifyWorkerUpdateError(toasts, error);

    expect(toasts.addError).toHaveBeenCalledWith(error, { title: 'Unable to update the worker' });
    expect(toasts.addWarning).not.toHaveBeenCalled();
    expect(toasts.addDanger).not.toHaveBeenCalled();
  });
});

describe('useUpdateWorker', () => {
  const renderUpdateWorker = (worker: Worker, patchImpl: jest.Mock) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.workers.list(), { workers: [worker] });
    const services = { ...coreMock.createStart(), http: { patch: patchImpl } };
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    );
    return { queryClient, ...renderHook(() => useUpdateWorker(), { wrapper }) };
  };

  const scheduledWorker = createWorker({
    settingsRevision: 4,
    settings: { workerId: TRIAGE, autonomy: 'manual', scheduleInterval: '24h' },
  });

  it("sends the caller's revision as-is instead of the cached one", async () => {
    const patch = jest.fn().mockResolvedValue({
      worker: createWorker({
        settingsRevision: 5,
        settings: { workerId: TRIAGE, autonomy: 'manual', scheduleInterval: '15m' },
      }),
    });
    // The cache holds revision 4; the draft was built from revision 3 and must say so.
    const { result } = renderUpdateWorker(scheduledWorker, patch);

    await act(async () => {
      result.current.mutate({
        workerId: TRIAGE,
        patch: { settings: { scheduleInterval: '15m' }, settingsRevision: 3 },
      });
    });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(patch.mock.calls[0][1].body)).toEqual({
      settings: { scheduleInterval: '15m' },
      settingsRevision: 3,
    });
  });

  it('leaves the cached Worker untouched while the PATCH is pending and replaces it on success', async () => {
    let resolvePatch: ((value: { worker: Worker }) => void) | undefined;
    const patch = jest.fn(
      () =>
        new Promise<{ worker: Worker }>((resolve) => {
          resolvePatch = resolve;
        })
    );
    const cached = createWorker();
    const { queryClient, result } = renderUpdateWorker(cached, patch);

    act(() => {
      result.current.mutate({
        workerId: TRIAGE,
        patch: { settings: { autonomy: 'assisted' }, settingsRevision: 1 },
      });
    });
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));

    expect(queryClient.getQueryData(queryKeys.workers.list())).toEqual({ workers: [cached] });

    const persisted = createWorker({
      settingsRevision: 2,
      settings: { workerId: TRIAGE, autonomy: 'assisted' },
    });
    await act(async () => {
      resolvePatch!({ worker: persisted });
    });

    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.workers.list())).toEqual({ workers: [persisted] })
    );
  });

  it('does not roll back a previously saved Worker when a later PATCH fails', async () => {
    const attackDiscovery = createWorker({
      id: 'system-security-floor-attack-discovery',
      name: 'Attack Discovery',
      settings: {
        workerId: 'system-security-floor-attack-discovery',
        autonomy: 'manual',
        scheduleInterval: '24h',
      },
    });
    const persistedTriage = createWorker({
      settingsRevision: 2,
      settings: { workerId: TRIAGE, autonomy: 'assisted' },
    });
    const patch = jest
      .fn()
      .mockResolvedValueOnce({ worker: persistedTriage })
      .mockRejectedValueOnce(httpError(503));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.workers.list(), {
      workers: [createWorker(), attackDiscovery],
    });
    const services = { ...coreMock.createStart(), http: { patch } };
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    );
    const { result } = renderHook(() => useUpdateWorker(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        workerId: TRIAGE,
        patch: { settings: { autonomy: 'assisted' }, settingsRevision: 1 },
      });
    });
    expect(queryClient.getQueryData(queryKeys.workers.list())).toEqual({
      workers: [persistedTriage, attackDiscovery],
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          workerId: attackDiscovery.id,
          patch: { settings: { scheduleInterval: '1h' }, settingsRevision: 1 },
        })
      ).rejects.toThrow('HTTP 503');
    });

    expect(queryClient.getQueryData(queryKeys.workers.list())).toEqual({
      workers: [persistedTriage, attackDiscovery],
    });
    expect(services.notifications.toasts.addError).toHaveBeenCalledTimes(1);
  });

  it('sends a null revision for a Worker that is not installed yet', async () => {
    const uninstalled = createWorker({ settingsRevision: null });
    const patch = jest.fn().mockResolvedValue({
      worker: createWorker({
        settingsRevision: 1,
        settings: { workerId: TRIAGE, autonomy: 'assisted' },
      }),
    });
    const { result } = renderUpdateWorker(uninstalled, patch);

    await act(async () => {
      result.current.mutate({
        workerId: TRIAGE,
        patch: { settings: { autonomy: 'assisted' }, settingsRevision: null },
      });
    });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(JSON.parse(patch.mock.calls[0][1].body)).toEqual({
      settings: { autonomy: 'assisted' },
      settingsRevision: null,
    });
  });
});
