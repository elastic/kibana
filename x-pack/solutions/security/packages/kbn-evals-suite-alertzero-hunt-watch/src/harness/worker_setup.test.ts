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
}: {
  accounts?: Array<{ id: string; name: string; enabled: boolean; assumable: boolean }>;
  worker?: { enabled: boolean; serviceAccountId?: string };
  enableWorks?: boolean;
}) => {
  const requests: Req[] = [];
  const state = { ...worker };
  const request = jest.fn(async (req: Req) => {
    requests.push(req);
    if (req.path.startsWith('/api/security/role/')) return { data: {} };
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

describe('ensureHuntWorkerEnabled (B4)', () => {
  it('creates the role (createOnly), a service account, and PATCH-enables with the current revision', async () => {
    const { kbnClient, requests } = makeServer({});
    const out = await ensureHuntWorkerEnabled(kbnClient, log);
    expect(out.serviceAccountId).toBe('sa-new');

    const role = requests.find((r) => r.path.startsWith('/api/security/role/'))!;
    expect(role.path).toBe(`/api/security/role/${HUNT_WORKER_ACCOUNT_NAME}`);
    expect(role.query).toEqual({ createOnly: true });

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

  it('reuses an existing enabled, assumable service account instead of creating one', async () => {
    const { kbnClient, requests } = makeServer({
      accounts: [{ id: 'sa-1', name: HUNT_WORKER_ACCOUNT_NAME, enabled: true, assumable: true }],
    });
    const out = await ensureHuntWorkerEnabled(kbnClient, log);
    expect(out.serviceAccountId).toBe('sa-1');
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

  it('treats a 409 on role creation as "already exists"', async () => {
    const { kbnClient } = makeServer({});
    const original = (kbnClient.request as jest.Mock).getMockImplementation()!;
    (kbnClient.request as jest.Mock).mockImplementation(async (req: Req) => {
      if (req.path.startsWith('/api/security/role/')) {
        // The real error shape: status on the error itself, as kbn-client throws it.
        throw new KbnClientRequesterError('conflict', { status: 409 });
      }
      return original(req);
    });
    await expect(ensureHuntWorkerEnabled(kbnClient, log)).resolves.toEqual({
      serviceAccountId: 'sa-new',
    });
  });
});
