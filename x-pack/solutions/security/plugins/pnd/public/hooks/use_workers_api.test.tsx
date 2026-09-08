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
} from '@kbn/pnd-common';
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
  it('sends the revision from the previous queued response, not the stale cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(queryKeys.workers.list(), { workers: [createWorker()] });

    let resolveEnable: ((worker: Worker) => void) | undefined;
    const patch = jest.fn((url: string, options: { body: string }) => {
      const body = JSON.parse(options.body) as { enabled?: boolean; settingsRevision?: number };
      if (body.enabled === true) {
        return new Promise((resolve) => {
          resolveEnable = (worker) => resolve({ worker });
        });
      }
      return Promise.resolve({
        worker: createWorker({
          enabled: true,
          settingsRevision: 3,
          settings: { workerId: TRIAGE, autonomy: 'assisted' },
          state: 'ok',
        }),
      });
    });

    const services = {
      ...coreMock.createStart(),
      http: { patch },
    };
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    );

    const { result } = renderHook(() => useUpdateWorker(), { wrapper });

    act(() => {
      result.current.mutate({ workerId: TRIAGE, patch: { enabled: true } });
      result.current.mutate({ workerId: TRIAGE, patch: { autonomyLevel: 'assisted' } });
    });

    await waitFor(() => expect(resolveEnable).toBeDefined());
    await act(async () => {
      resolveEnable!(
        createWorker({
          enabled: true,
          settingsRevision: 2,
          state: 'ok',
        })
      );
    });

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));

    const autonomyBody = JSON.parse(patch.mock.calls[1][1].body);
    expect(autonomyBody).toEqual({
      autonomyLevel: 'assisted',
      settingsRevision: 2,
    });
  });
});
