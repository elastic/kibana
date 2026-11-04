/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { enableFloorWorker, ensureFloorServiceAccount, FLOOR_WORKER_ID } from './floor_worker';

jest.mock('./kibana_api', () => ({
  ...jest.requireActual('./kibana_api'),
  sleep: jest.fn(async () => undefined),
}));

const log = { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;
const NAME = 'alertzero_attack_discovery';
const usable = { id: 'sa-1', name: NAME, enabled: true, assumable: true };

type Handler = (path: string, options?: { method?: string }) => unknown;
const fetchWith = (handler: Handler) =>
  jest.fn(async (path: string, o?: { method?: string }) => handler(path, o));

describe('ensureFloorServiceAccount', () => {
  it('reuses an enabled, assumable account', async () => {
    const fetch = fetchWith(() => ({ serviceAccounts: [usable], nextPage: null }));
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).resolves.toBe(
      'sa-1'
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('creates the account with the reserved built-in role when missing', async () => {
    const fetch = fetchWith((path, o) => {
      if (path.includes('/api/security/role/')) return { metadata: { _reserved: true } };
      if (o?.method === 'POST') return { id: 'sa-new' };
      return { serviceAccounts: [], nextPage: null };
    });
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).resolves.toBe(
      'sa-new'
    );
    const post = fetch.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse((post?.[1] as { body: string }).body)).toMatchObject({
      name: NAME,
      roles: [NAME],
    });
  });

  it('refuses a role that is not reserved', async () => {
    const fetch = fetchWith((path) =>
      path.includes('/api/security/role/')
        ? { metadata: {} }
        : { serviceAccounts: [], nextPage: null }
    );
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).rejects.toThrow(
      /not a reserved/
    );
  });

  it('looks the account up again after a 409 on create', async () => {
    let lists = 0;
    const fetch = fetchWith((path, o) => {
      if (path.includes('/api/security/role/')) return { metadata: { _reserved: true } };
      if (o?.method === 'POST') throw Object.assign(new Error('conflict'), { status: 409 });
      lists += 1;
      return { serviceAccounts: lists > 1 ? [usable] : [], nextPage: null };
    });
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).resolves.toBe(
      'sa-1'
    );
  });
});

describe('enableFloorWorker', () => {
  const worker = (over: Record<string, unknown>) => ({
    id: FLOOR_WORKER_ID,
    enabled: false,
    settingsRevision: 3,
    ...over,
  });

  const run = (before: Record<string, unknown>, after: Record<string, unknown>) => {
    let reads = 0;
    const fetch = fetchWith((_path, o) => {
      if (o?.method === 'PATCH') return {};
      reads += 1;
      return { workers: [reads === 1 ? worker(before) : worker(after)] };
    });
    return {
      fetch,
      promise: enableFloorWorker({
        fetch: fetch as unknown as HttpHandler,
        log,
        serviceAccountId: 'sa-1',
      }),
    };
  };

  const patches = (fetch: jest.Mock) =>
    fetch.mock.calls
      .filter(([, o]) => o?.method === 'PATCH')
      .map(([, o]) => JSON.parse((o as { body: string }).body));

  it('enables with manual autonomy and a long interval, then disables on restore', async () => {
    const { fetch, promise } = run({}, { enabled: true, workflowId: 'wf-1' });
    const enabled = await promise;
    expect(enabled.workflowId).toBe('wf-1');
    expect(patches(fetch)[0]).toMatchObject({
      enabled: true,
      settingsRevision: 3,
      settings: { serviceAccountId: 'sa-1', autonomy: 'manual', scheduleInterval: '24h' },
    });
    await enabled.restore();
    expect(patches(fetch)[1]).toEqual({ enabled: false });
  });

  it('leaves a worker that was already enabled alone on restore', async () => {
    const { fetch, promise } = run({ enabled: true }, { enabled: true, workflowId: 'wf-1' });
    await (await promise).restore();
    expect(patches(fetch)).toHaveLength(1);
  });

  it('fails when the worker is blocked', async () => {
    const { promise } = run({ blockingReasons: ['no_model'] }, {});
    await expect(promise).rejects.toThrow(/no_model/);
  });

  it('fails when the worker does not come up enabled', async () => {
    const { promise } = run({}, { enabled: false });
    await expect(promise).rejects.toThrow(/did not enable/);
  });
});
