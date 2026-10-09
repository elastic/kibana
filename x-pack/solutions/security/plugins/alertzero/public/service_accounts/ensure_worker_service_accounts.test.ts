/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  WORKER_ROLE_DEFINITIONS,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
} from '@kbn/alertzero-common';
import {
  ensureWorkerServiceAccounts,
  type CoreServiceAccounts,
} from './ensure_worker_service_accounts';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;

const httpError = (status: number, message = `HTTP ${status}`) =>
  Object.assign(new Error(message), {
    name: 'Error',
    request: {},
    response: { status },
    body: { message },
  });

const account = (
  name: string,
  overrides: Partial<{ enabled: boolean; assumable: boolean }> = {}
) => ({
  id: `kibana/${name}`,
  name,
  enabled: true,
  assumable: true,
  ...overrides,
});

const setup = ({
  pages = [{ serviceAccounts: [] as Array<ReturnType<typeof account>> }],
  enabled = true,
}: {
  pages?: Array<{ serviceAccounts: Array<ReturnType<typeof account>>; nextPage?: string }>;
  enabled?: boolean;
} = {}) => {
  const get = jest.fn();
  pages.forEach((page) => get.mockResolvedValueOnce(page));
  const put = jest.fn().mockResolvedValue({});
  const http = { get, put } as unknown as HttpStart;
  const serviceAccounts = {
    isEnabled: jest.fn(() => enabled),
    canCreate: jest.fn(() => true),
    create: jest.fn(async ({ name }: { name: string }) => ({ id: `kibana/${name}` })),
  } as unknown as CoreServiceAccounts & { create: jest.Mock };
  return { http, get, put, serviceAccounts };
};

describe('ensureWorkerServiceAccounts', () => {
  it('creates the role and the account for a worker that has none', async () => {
    const { http, put, serviceAccounts } = setup();

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE]);

    const { name, role } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    expect(put).toHaveBeenCalledWith(`/api/security/role/${name}`, {
      version: SECURITY_ROLE_API_VERSION,
      query: { createOnly: true },
      body: JSON.stringify(role),
    });
    expect(serviceAccounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ name, roles: [name] })
    );
    expect(results.get(TRIAGE)).toEqual({ ok: true, serviceAccountId: `kibana/${name}` });
  });

  it('reuses an existing account without touching its role', async () => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const { http, put, serviceAccounts } = setup({
      pages: [
        { serviceAccounts: [account('other')], nextPage: 'cursor' },
        { serviceAccounts: [account(name)] },
      ],
    });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE]);

    expect(results.get(TRIAGE)).toEqual({ ok: true, serviceAccountId: `kibana/${name}` });
    expect(put).not.toHaveBeenCalled();
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('lists the accounts once for several workers', async () => {
    const { http, get, serviceAccounts } = setup();

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE, TUNING]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(SECURITY_SERVICE_ACCOUNT_URL, { query: { limit: 100 } });
    expect([...results.values()].every(({ ok }) => ok)).toBe(true);
  });

  it('reports an existing account that Kibana cannot run as', async () => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const { http, serviceAccounts } = setup({
      pages: [{ serviceAccounts: [account(name, { assumable: false })] }],
    });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE]);

    expect(results.get(TRIAGE)).toEqual({ ok: false, error: expect.stringContaining(name) });
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('keeps an existing role and still creates the account', async () => {
    const { http, put, serviceAccounts } = setup();
    put.mockRejectedValueOnce(httpError(409));

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE]);

    expect(serviceAccounts.create).toHaveBeenCalled();
    expect(results.get(TRIAGE)?.ok).toBe(true);
  });

  it('picks up an account created concurrently', async () => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const { http, get, serviceAccounts } = setup();
    get.mockResolvedValueOnce({ serviceAccounts: [account(name)] });
    serviceAccounts.create.mockRejectedValueOnce(httpError(409));

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE]);

    expect(results.get(TRIAGE)).toEqual({ ok: true, serviceAccountId: `kibana/${name}` });
  });

  it('reports a failure when the lookup after a conflict also fails', async () => {
    const { http, get, serviceAccounts } = setup();
    serviceAccounts.create.mockRejectedValueOnce(httpError(409));
    get.mockRejectedValueOnce(httpError(503, 'Service unavailable'));

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE]);

    expect(results.get(TRIAGE)).toEqual({ ok: false, error: 'Service unavailable' });
  });

  it('fails only the worker whose role cannot be created', async () => {
    const { http, put, serviceAccounts } = setup();
    put.mockImplementation(async (url: string) => {
      if (url.includes(WORKER_ROLE_DEFINITIONS[TRIAGE].name)) throw httpError(403, 'Forbidden');
      return {};
    });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE, TUNING]);

    expect(results.get(TRIAGE)).toEqual({ ok: false, error: 'Forbidden' });
    expect(results.get(TUNING)?.ok).toBe(true);
  });

  it('fails every worker when service accounts are not enabled', async () => {
    const { http, get, serviceAccounts } = setup({ enabled: false });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE, TUNING]);

    expect(get).not.toHaveBeenCalled();
    expect(results.get(TRIAGE)?.ok).toBe(false);
    expect(results.get(TUNING)?.ok).toBe(false);
  });

  it('fails a worker that has no prebuilt role', async () => {
    const { http, serviceAccounts } = setup();

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, ['unknown-worker']);

    expect(results.get('unknown-worker')?.ok).toBe(false);
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('does nothing without workers', async () => {
    const { http, get, serviceAccounts } = setup();

    expect((await ensureWorkerServiceAccounts(http, serviceAccounts, [])).size).toBe(0);
    expect(get).not.toHaveBeenCalled();
  });
});
