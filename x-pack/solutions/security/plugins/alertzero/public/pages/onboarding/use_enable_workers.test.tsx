/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, buildWorkerUrl } from '@kbn/alertzero-common';
import { queryKeys } from '../../query_keys';
import { useEnableWorkers } from './use_enable_workers';

const WORKER_ID = 'worker-a';
const OTHER_ID = 'worker-b';

const mockEnsureWorkerServiceAccounts = jest.fn();
jest.mock('../../service_accounts/ensure_worker_service_accounts', () => ({
  ensureWorkerServiceAccounts: (...args: unknown[]) => mockEnsureWorkerServiceAccounts(...args),
}));

jest.mock('../../telemetry', () => ({ useReportToastError: () => jest.fn() }));
jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

type PatchCall = [url: string, options: { version: string; body: string }];

const patchBody = ([, { body }]: PatchCall) => JSON.parse(body);

const setup = (accountResult: Record<string, unknown>) => {
  const patch = jest.fn(async (..._args: PatchCall) => ({ worker: { settingsRevision: 8 } }));
  (useKibana as jest.Mock).mockReturnValue({
    services: {
      http: { patch },
      serviceAccounts: {},
      isServerless: false,
      notifications: { toasts: { addDanger: jest.fn(), addWarning: jest.fn() } },
    },
  });
  mockEnsureWorkerServiceAccounts.mockImplementation(
    async (_http: unknown, _accounts: unknown, ids: string[]) =>
      new Map(ids.map((id) => [id, accountResult]))
  );

  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.workers.list(), {
    workers: [
      {
        id: WORKER_ID,
        settings: { serviceAccountId: 'kibana/bound' },
        settingsRevision: 3,
      },
      { id: OTHER_ID, settings: {}, settingsRevision: 1 },
    ],
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useEnableWorkers([WORKER_ID, OTHER_ID], { [WORKER_ID]: true, [OTHER_ID]: false }),
    { wrapper }
  );
  return { patch, enable: () => act(async () => result.current.handleEnableAndContinue()) };
};

describe('useEnableWorkers', () => {
  it('only toggles a worker whose existing binding is kept', async () => {
    const { patch, enable } = setup({ ok: true, serviceAccountId: 'kibana/bound' });

    await enable();

    expect(patch).toHaveBeenCalledWith(buildWorkerUrl(WORKER_ID), {
      version: API_VERSIONS.internal.v1,
      body: JSON.stringify({ enabled: true }),
    });
  });

  it('binds a worker to a different account in one write', async () => {
    const { patch, enable } = setup({ ok: true, serviceAccountId: 'kibana/new' });

    await enable();

    const calls = patch.mock.calls.filter(([url]) => url === buildWorkerUrl(WORKER_ID));
    expect(calls.map(patchBody)).toEqual([
      { enabled: true, settings: { serviceAccountId: 'kibana/new' }, settingsRevision: 3 },
    ]);
  });

  it('clears then rebinds an account that came back under the same id', async () => {
    const { patch, enable } = setup({
      ok: true,
      serviceAccountId: 'kibana/bound',
      replacedBound: true,
    });

    await enable();

    const calls = patch.mock.calls.filter(([url]) => url === buildWorkerUrl(WORKER_ID));
    expect(calls.map(patchBody)).toEqual([
      { enabled: false, settings: { serviceAccountId: null }, settingsRevision: 3 },
      {
        enabled: true,
        settings: { serviceAccountId: 'kibana/bound' },
        // The revision comes from the clearing write's response.
        settingsRevision: 8,
      },
    ]);
  });

  it('does not clear the binding when the account is unusable', async () => {
    const { patch, enable } = setup({ ok: false, error: 'unusable' });

    await enable();

    expect(patch.mock.calls.map(([url]) => url)).not.toContain(buildWorkerUrl(WORKER_ID));
  });
});
