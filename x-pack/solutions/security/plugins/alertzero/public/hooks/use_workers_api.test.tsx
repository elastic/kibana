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
  workflowId: null,
  blockingReasons: [],
  settings: {
    workerId: TRIAGE,
    autonomy: 'manual',
  },
  ...overrides,
});

const httpErrorWith = (
  status: number,
  { statusText, body }: { statusText?: string; body?: unknown } = {}
): Error =>
  Object.assign(new Error(statusText ?? ''), {
    name: 'Error',
    request: {},
    response: { status, statusText },
    body,
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

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Unable to update the worker',
      toastMessage: '500',
    });
    expect(toasts.addWarning).not.toHaveBeenCalled();
    expect(toasts.addDanger).not.toHaveBeenCalled();
  });

  it("shows the server's message when the response carries one", () => {
    const error = Object.assign(httpError(400), {
      body: { message: 'Alert Triage cannot be turned on because no AI model is available.' },
    });
    notifyWorkerUpdateError(toasts, error);

    expect(toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Unable to update the worker',
      toastMessage: 'Alert Triage cannot be turned on because no AI model is available.',
    });
  });

  describe('naming the Worker', () => {
    it('puts the Worker name in the title', () => {
      const error = httpErrorWith(500, { statusText: 'Internal Server Error' });
      notifyWorkerUpdateError(toasts, error, { workerName: 'Alert Triage' });

      expect(toasts.addError).toHaveBeenCalledWith(error, {
        title: "Couldn't update Alert Triage",
        toastMessage: '500 Internal Server Error',
      });
    });

    it('passes a 400 body message through verbatim', () => {
      const error = httpErrorWith(400, {
        statusText: 'Bad Request',
        body: { message: 'Attack Discovery needs an AI model.' },
      });
      notifyWorkerUpdateError(toasts, error, { workerName: 'Attack Discovery' });

      expect(toasts.addError).toHaveBeenCalledWith(error, {
        title: "Couldn't update Attack Discovery",
        toastMessage: 'Attack Discovery needs an AI model.',
      });
    });

    it('falls back to the status code when statusText is empty and there is no body', () => {
      const error = httpErrorWith(500, { statusText: '' });
      notifyWorkerUpdateError(toasts, error, { workerName: 'Alert Triage' });

      expect(toasts.addError).toHaveBeenCalledWith(error, {
        title: "Couldn't update Alert Triage",
        toastMessage: '500',
      });
    });

    it('ignores a blank body message', () => {
      const error = httpErrorWith(502, { statusText: '', body: { message: '  ' } });
      notifyWorkerUpdateError(toasts, error, { workerName: 'Alert Triage' });

      expect(toasts.addError).toHaveBeenCalledWith(error, {
        title: "Couldn't update Alert Triage",
        toastMessage: '502',
      });
    });

    it('keeps the generic title when no name is given', () => {
      const error = httpErrorWith(500, { statusText: '' });
      notifyWorkerUpdateError(toasts, error);

      expect(toasts.addError).toHaveBeenCalledWith(error, {
        title: 'Unable to update the worker',
        toastMessage: '500',
      });
    });

    it('does not invent a reason for a non-HTTP error', () => {
      const error = new Error('boom');
      notifyWorkerUpdateError(toasts, error, { workerName: 'Alert Triage' });

      expect(toasts.addError).toHaveBeenCalledWith(error, {
        title: "Couldn't update Alert Triage",
      });
    });

    it('names the Worker in the 409 and 403 messages', () => {
      notifyWorkerUpdateError(toasts, httpError(409), { workerName: 'Alert Triage' });
      expect(toasts.addWarning).toHaveBeenCalledWith(
        'Alert Triage settings changed; reload and try again'
      );

      notifyWorkerUpdateError(toasts, httpError(403), { workerName: 'Alert Triage' });
      expect(toasts.addDanger).toHaveBeenCalledWith(
        'You do not have permission to update Alert Triage'
      );
    });
  });

  it.each([
    [409, 'conflict'],
    [403, 'forbidden'],
    [500, 'server'],
  ] as const)('reports a %d toast once, as %s', (status, errorClass) => {
    const reportShown = jest.fn();

    notifyWorkerUpdateError(toasts, httpError(status), { reportShown });

    expect(reportShown.mock.calls).toEqual([[errorClass]]);
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
    return { queryClient, services, ...renderHook(() => useUpdateWorker(), { wrapper }) };
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

  it('shows no warning when a Worker is enabled, since enabling no longer touches rules', async () => {
    const patch = jest.fn().mockResolvedValue({ worker: createWorker() });
    const { result, services } = renderUpdateWorker(createWorker(), patch);

    await act(async () => {
      result.current.mutate({ workerId: TRIAGE, patch: { enabled: true } });
    });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(services.notifications.toasts.addWarning).not.toHaveBeenCalled();
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

  it('refreshes the Hunt worker index coverage once the update settles', async () => {
    const patch = jest.fn().mockResolvedValue({ worker: createWorker({ settingsRevision: 5 }) });
    const { queryClient, result } = renderUpdateWorker(scheduledWorker, patch);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      await result.current.mutateAsync({
        workerId: TRIAGE,
        patch: { settings: { scheduleInterval: '15m' }, settingsRevision: 4 },
      });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.huntWorkerIndexCoverage.all,
    });
  });

  it('names the cached Worker in the toast when the PATCH fails', async () => {
    const patch = jest.fn().mockRejectedValue(
      httpErrorWith(400, {
        statusText: 'Bad Request',
        body: { message: 'No AI model is available.' },
      })
    );
    const { result, services } = renderUpdateWorker(
      createWorker({ name: 'Triage (cached)' }),
      patch
    );

    await act(async () => {
      await expect(
        result.current.mutateAsync({ workerId: TRIAGE, patch: { enabled: true } })
      ).rejects.toThrow();
    });

    // The built-in name for a known Worker id wins over the cached one.
    expect(services.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: "Couldn't update Alert Triage",
      toastMessage: 'No AI model is available.',
    });
  });

  it('falls back to the cached name for a Worker id without a built-in name', async () => {
    const patch = jest.fn().mockRejectedValue(httpErrorWith(500, { statusText: '' }));
    const custom = createWorker({ id: 'custom-worker', name: 'My Custom Worker' });
    const { result, services } = renderUpdateWorker(custom, patch);

    await act(async () => {
      await expect(
        result.current.mutateAsync({ workerId: 'custom-worker', patch: { enabled: true } })
      ).rejects.toThrow();
    });

    expect(services.notifications.toasts.addError).toHaveBeenCalledWith(expect.any(Error), {
      title: "Couldn't update My Custom Worker",
      toastMessage: '500',
    });
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
