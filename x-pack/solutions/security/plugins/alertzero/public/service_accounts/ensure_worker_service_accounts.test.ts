/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import {
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
} from '@kbn/alertzero-common';
import {
  SECURITY_ROLES_URL,
  SECURITY_ROLE_API_VERSION,
  WORKER_ROLE_DEFINITIONS,
  getWorkerRoleName,
} from '../../common/worker_roles';
import {
  ensureWorkerServiceAccounts,
  type CoreServiceAccounts,
} from './ensure_worker_service_accounts';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;
const STATEFUL = { isServerless: false };
const SERVERLESS = { isServerless: true };

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

interface RoleEntry {
  name: string;
  metadata?: { _reserved?: boolean };
}

const reserved = (name: string): RoleEntry => ({ name, metadata: { _reserved: true } });

/** Every worker's built-in role on both stateful and Serverless. */
const ALL_BUILT_IN_ROLES = Object.values(WORKER_ROLE_DEFINITIONS).flatMap(({ name }) => [
  reserved(getWorkerRoleName(name, STATEFUL)),
  reserved(getWorkerRoleName(name, SERVERLESS)),
]);

const setup = ({
  pages = [{ serviceAccounts: [] as Array<ReturnType<typeof account>> }],
  enabled = true,
  roles = ALL_BUILT_IN_ROLES,
}: {
  pages?: Array<{ serviceAccounts: Array<ReturnType<typeof account>>; nextPage?: string }>;
  enabled?: boolean;
  /** What the role listing returns. */
  roles?: RoleEntry[];
} = {}) => {
  // Pages answer the account listings in order; the role listing answers by URL.
  const get = jest.fn(
    async (url: string): Promise<unknown> => (url === SECURITY_ROLES_URL ? roles : undefined)
  );
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

const roleListingCalls = (get: jest.Mock) =>
  get.mock.calls.filter(([url]) => url === SECURITY_ROLES_URL);

describe('ensureWorkerServiceAccounts', () => {
  it('reuses an existing account without looking up its role', async () => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const { http, get, put, serviceAccounts } = setup({
      pages: [
        { serviceAccounts: [account('other')], nextPage: 'cursor' },
        { serviceAccounts: [account(name)] },
      ],
    });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], STATEFUL);

    expect(results.get(TRIAGE)).toEqual({ ok: true, serviceAccountId: `kibana/${name}` });
    expect(roleListingCalls(get)).toHaveLength(0);
    expect(put).not.toHaveBeenCalled();
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('lists the accounts and the roles once for several workers', async () => {
    const { http, get, serviceAccounts } = setup();

    const results = await ensureWorkerServiceAccounts(
      http,
      serviceAccounts,
      [TRIAGE, TUNING],
      STATEFUL
    );

    expect(get).toHaveBeenCalledWith(SECURITY_SERVICE_ACCOUNT_URL, { query: { limit: 100 } });
    expect(get.mock.calls.filter(([url]) => url === SECURITY_SERVICE_ACCOUNT_URL)).toHaveLength(1);
    expect(roleListingCalls(get)).toHaveLength(1);
    expect([...results.values()].every(({ ok }) => ok)).toBe(true);
  });

  it('reports an existing account that Kibana cannot run as', async () => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const { http, serviceAccounts } = setup({
      pages: [{ serviceAccounts: [account(name, { assumable: false })] }],
    });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], STATEFUL);

    expect(results.get(TRIAGE)).toEqual({ ok: false, error: expect.stringContaining(name) });
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('picks up an account created concurrently', async () => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const { http, get, serviceAccounts } = setup();
    // After the first page, account listings see the account the other tab created.
    get.mockImplementation(async (url: string) =>
      url === SECURITY_ROLES_URL ? ALL_BUILT_IN_ROLES : { serviceAccounts: [account(name)] }
    );
    serviceAccounts.create.mockRejectedValueOnce(httpError(409));

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], STATEFUL);

    expect(results.get(TRIAGE)).toEqual({ ok: true, serviceAccountId: `kibana/${name}` });
  });

  it('reports a failure when the lookup after a conflict also fails', async () => {
    const { http, get, serviceAccounts } = setup();
    serviceAccounts.create.mockRejectedValueOnce(httpError(409));
    get.mockImplementation(async (url: string) => {
      if (url === SECURITY_ROLES_URL) return ALL_BUILT_IN_ROLES;
      throw httpError(503, 'Service unavailable');
    });

    const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], STATEFUL);

    expect(results.get(TRIAGE)).toEqual({ ok: false, error: 'Service unavailable' });
  });

  it('fails every worker when service accounts are not enabled', async () => {
    const { http, get, serviceAccounts } = setup({ enabled: false });

    const results = await ensureWorkerServiceAccounts(
      http,
      serviceAccounts,
      [TRIAGE, TUNING],
      STATEFUL
    );

    expect(get).not.toHaveBeenCalled();
    expect(results.get(TRIAGE)?.ok).toBe(false);
    expect(results.get(TUNING)?.ok).toBe(false);
  });

  it('fails a worker that has no prebuilt role', async () => {
    const { http, serviceAccounts } = setup();

    const results = await ensureWorkerServiceAccounts(
      http,
      serviceAccounts,
      ['unknown-worker'],
      STATEFUL
    );

    expect(results.get('unknown-worker')?.ok).toBe(false);
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('does nothing without workers', async () => {
    const { http, get, serviceAccounts } = setup();

    expect((await ensureWorkerServiceAccounts(http, serviceAccounts, [], STATEFUL)).size).toBe(0);
    expect(get).not.toHaveBeenCalled();
  });

  describe.each([
    ['stateful', STATEFUL, 'Elasticsearch has no built-in'],
    ['Serverless', SERVERLESS, 'does not exist in this project'],
  ])('on %s', (_flavor, options, missingMessage) => {
    const { name } = WORKER_ROLE_DEFINITIONS[TRIAGE];
    const roleName = getWorkerRoleName(name, options);
    const tuningRoleName = getWorkerRoleName(WORKER_ROLE_DEFINITIONS[TUNING].name, options);

    it('creates the account with the built-in role and never creates a role', async () => {
      const { http, get, put, serviceAccounts } = setup();

      const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], options);

      expect(get).toHaveBeenCalledWith(SECURITY_ROLES_URL, {
        version: SECURITY_ROLE_API_VERSION,
        query: { includeReservedRoles: true },
      });
      expect(put).not.toHaveBeenCalled();
      expect(serviceAccounts.create).toHaveBeenCalledWith(
        expect.objectContaining({ name, roles: [roleName] })
      );
      expect(results.get(TRIAGE)).toEqual({ ok: true, serviceAccountId: `kibana/${name}` });
    });

    it('fails only the worker whose built-in role is missing', async () => {
      const { http, serviceAccounts } = setup({ roles: [reserved(roleName)] });

      const results = await ensureWorkerServiceAccounts(
        http,
        serviceAccounts,
        [TRIAGE, TUNING],
        options
      );

      expect(results.get(TUNING)).toEqual({
        ok: false,
        error: expect.stringContaining(missingMessage),
      });
      expect(results.get(TUNING)).toEqual({
        ok: false,
        error: expect.stringContaining(tuningRoleName),
      });
      expect(serviceAccounts.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ roles: [tuningRoleName] })
      );
      expect(results.get(TRIAGE)?.ok).toBe(true);
    });

    it('fails a worker whose role of that name is not built in', async () => {
      const { http, serviceAccounts } = setup({ roles: [{ name: roleName, metadata: {} }] });

      const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], options);

      expect(results.get(TRIAGE)).toEqual({
        ok: false,
        error: expect.stringContaining(missingMessage),
      });
      expect(serviceAccounts.create).not.toHaveBeenCalled();
    });

    it('fails the workers when the roles cannot be listed', async () => {
      const { http, get, serviceAccounts } = setup();
      get.mockImplementation(async (url: string) => {
        if (url === SECURITY_ROLES_URL) throw httpError(403, 'Forbidden');
      });

      const results = await ensureWorkerServiceAccounts(http, serviceAccounts, [TRIAGE], options);

      expect(results.get(TRIAGE)).toEqual({ ok: false, error: 'Forbidden' });
      expect(serviceAccounts.create).not.toHaveBeenCalled();
    });
  });
});
