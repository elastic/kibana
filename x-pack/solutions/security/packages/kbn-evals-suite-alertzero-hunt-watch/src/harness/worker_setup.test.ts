/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClientRequesterError, type KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { HUNT_WORKER_ACCOUNT_NAME, HUNT_WORKER_ID, ensureHuntWorkerEnabled } from './worker_setup';

interface Req {
  path: string;
  method?: string;
  query?: Record<string, unknown>;
  body?: { settings: { serviceAccountId: string } };
}

const log = {
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
} as unknown as ToolingLog;

const makeServer = ({
  accounts = [],
  worker = { enabled: false },
  enableWorks = true,
  flavor = 'traditional',
  role = () => ({ metadata: { _reserved: true } }),
}: {
  accounts?: Array<{ id: string; name: string; enabled: boolean; assumable: boolean }>;
  worker?: { enabled: boolean; serviceAccountId?: string };
  enableWorks?: boolean;
  flavor?: string;
  role?: (name: string) => unknown;
}) => {
  const requests: Req[] = [];
  const state = { ...worker };
  const request = jest.fn(async (req: Req) => {
    requests.push(req);
    if (req.path === '/api/status') return { data: { version: { build_flavor: flavor } } };
    if (req.path.startsWith('/api/security/role/')) {
      return { data: role(decodeURIComponent(req.path.slice('/api/security/role/'.length))) };
    }
    if (req.path === '/internal/security/service_account' && req.method === 'GET') {
      return { data: { serviceAccounts: accounts } };
    }
    if (req.path === '/internal/security/service_account' && req.method === 'POST') {
      return { data: { id: 'sa-new' } };
    }
    if (req.path === '/internal/alertzero/workers' && req.method === 'GET') {
      return {
        data: {
          workers: [
            {
              id: HUNT_WORKER_ID,
              enabled: state.enabled,
              settingsRevision: 7,
              settings: { serviceAccountId: state.serviceAccountId },
              blockingReasons: [{ code: 'no_service_account' }],
            },
          ],
        },
      };
    }
    if (req.method === 'PATCH') {
      if (enableWorks) {
        state.enabled = true;
        state.serviceAccountId = req.body?.settings.serviceAccountId;
      }
      return { data: {} };
    }
    throw new Error(`unexpected request ${req.method} ${req.path}`);
  });
  return { kbnClient: { request } as unknown as KbnClient, requests };
};

const roleRequests = (requests: Req[]) =>
  requests.filter((r) => r.path.startsWith('/api/security/role/'));

describe('ensureHuntWorkerEnabled (B4)', () => {
  it('looks up the built-in role, creates the service account with it, and PATCH-enables with the current revision', async () => {
    const { kbnClient, requests } = makeServer({});
    const out = await ensureHuntWorkerEnabled(kbnClient, log);
    expect(out.serviceAccountId).toBe('sa-new');

    expect(roleRequests(requests).map((r) => [r.path, r.method])).toEqual([
      [`/api/security/role/${HUNT_WORKER_ACCOUNT_NAME}`, 'GET'],
    ]);

    const create = requests.find((r) => r.method === 'POST')!;
    expect(create.body).toMatchObject({
      name: HUNT_WORKER_ACCOUNT_NAME,
      roles: [HUNT_WORKER_ACCOUNT_NAME],
    });

    const patch = requests.find((r) => r.method === 'PATCH')!;
    expect(patch.path).toBe(`/internal/alertzero/workers/${HUNT_WORKER_ID}`);
    expect(patch.body).toEqual({
      enabled: true,
      settingsRevision: 7,
      settings: { serviceAccountId: 'sa-new' },
    });
  });

  it('never issues a PUT to the role API', async () => {
    const { kbnClient, requests } = makeServer({});
    await ensureHuntWorkerEnabled(kbnClient, log);
    expect(roleRequests(requests).some((r) => r.method !== 'GET')).toBe(false);
    expect(requests.some((r) => r.query && 'createOnly' in r.query)).toBe(false);
  });

  it('uses the _-prefixed predefined role on Serverless', async () => {
    const { kbnClient, requests } = makeServer({ flavor: 'serverless' });
    await ensureHuntWorkerEnabled(kbnClient, log);
    expect(roleRequests(requests).map((r) => r.path)).toEqual([
      `/api/security/role/_${HUNT_WORKER_ACCOUNT_NAME}`,
    ]);
    expect(requests.find((r) => r.method === 'POST')!.body).toMatchObject({
      name: HUNT_WORKER_ACCOUNT_NAME,
      roles: [`_${HUNT_WORKER_ACCOUNT_NAME}`],
    });
  });

  it('fails loudly, naming the reserved role, when the stack lacks it (404)', async () => {
    const { kbnClient, requests } = makeServer({
      role: () => {
        throw new KbnClientRequesterError('not found', { status: 404 });
      },
    });
    await expect(ensureHuntWorkerEnabled(kbnClient, log)).rejects.toThrow(
      `reserved role ${HUNT_WORKER_ACCOUNT_NAME} is missing`
    );
    expect(requests.some((r) => r.method === 'POST' || r.method === 'PUT')).toBe(false);
  });

  it('fails loudly, naming the predefined role, on Serverless', async () => {
    const { kbnClient } = makeServer({
      flavor: 'serverless',
      role: () => {
        throw new KbnClientRequesterError('not found', { status: 404 });
      },
    });
    await expect(ensureHuntWorkerEnabled(kbnClient, log)).rejects.toThrow(
      `predefined role _${HUNT_WORKER_ACCOUNT_NAME} is missing`
    );
  });

  it('rejects a same-named role that is not reserved', async () => {
    const { kbnClient, requests } = makeServer({ role: () => ({ metadata: {} }) });
    await expect(ensureHuntWorkerEnabled(kbnClient, log)).rejects.toThrow(
      `role ${HUNT_WORKER_ACCOUNT_NAME} is missing`
    );
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('does not look up the role when the service account already exists', async () => {
    const { kbnClient, requests } = makeServer({
      accounts: [{ id: 'sa-1', name: HUNT_WORKER_ACCOUNT_NAME, enabled: true, assumable: true }],
    });
    const out = await ensureHuntWorkerEnabled(kbnClient, log);
    expect(out.serviceAccountId).toBe('sa-1');
    expect(roleRequests(requests)).toEqual([]);
    expect(requests.some((r) => r.method === 'POST')).toBe(false);
  });

  it('does not recreate an account that is disabled or not assumable', async () => {
    const { kbnClient, requests } = makeServer({
      accounts: [{ id: 'sa-1', name: HUNT_WORKER_ACCOUNT_NAME, enabled: true, assumable: false }],
    });
    const out = await ensureHuntWorkerEnabled(kbnClient, log);
    expect(out.serviceAccountId).toBe('sa-new');
    expect(requests.filter((r) => r.method === 'POST')).toHaveLength(1);
  });

  it('skips the PATCH when the Worker is already enabled with that service account', async () => {
    const { kbnClient, requests } = makeServer({
      accounts: [{ id: 'sa-1', name: HUNT_WORKER_ACCOUNT_NAME, enabled: true, assumable: true }],
      worker: { enabled: true, serviceAccountId: 'sa-1' },
    });
    await ensureHuntWorkerEnabled(kbnClient, log);
    expect(requests.some((r) => r.method === 'PATCH')).toBe(false);
  });

  it('asserts, never assumes: throws with the blocking reasons if the Worker is still disabled', async () => {
    const { kbnClient } = makeServer({ enableWorks: false });
    await expect(ensureHuntWorkerEnabled(kbnClient, log)).rejects.toThrow(
      /not enabled after setup.*no_service_account/
    );
  });
});
