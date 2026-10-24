/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccounts,
  NightshiftServiceAccountSetupError,
  type ListedServiceAccount,
  type NightshiftServiceAccountsApi,
} from './ensure_service_accounts';

const conflict = Object.assign(new Error('exists'), { status: 409 });

const createApi = ({
  accounts = [],
  roles = [
    'nightshift_agent',
    'nightshift_automations',
    '_nightshift_agent',
    '_nightshift_automations',
  ],
  createError,
}: {
  accounts?: ListedServiceAccount[];
  roles?: string[];
  createError?: Error;
} = {}) => {
  const listed = [...accounts];
  let nextId = 1;
  const api = {
    listServiceAccounts: jest.fn(async ({ limit, after }: { limit: number; after?: string }) => {
      const start = after ? Number(after) : 0;
      const page = listed.slice(start, start + limit);
      const next = start + limit;
      return {
        serviceAccounts: page,
        ...(next < listed.length ? { nextPage: String(next) } : {}),
      };
    }),
    roleExists: jest.fn(async (role: string) => roles.includes(role)),
    createServiceAccount: jest.fn(async ({ name }: { name: string; roles: string[] }) => {
      if (createError) throw createError;
      // UIAM-like ids: generated, unrelated to the name.
      const id = `uiam-${nextId++}`;
      listed.push({ id, name, enabled: true, assumable: true });
      return { id };
    }),
    isConflict: (error: unknown) => (error as { status?: number })?.status === 409,
  } satisfies NightshiftServiceAccountsApi;
  return { api, listed };
};

const account = (overrides: Partial<ListedServiceAccount> & { name: string }) => ({
  id: `id-${overrides.name}`,
  enabled: true,
  assumable: true,
  ...overrides,
});

describe('ensureNightshiftServiceAccounts', () => {
  it('creates missing accounts with their roles and returns the ids the backend assigned', async () => {
    const { api } = createApi();

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: true })).resolves.toEqual({
      agent: 'uiam-1',
      automations: 'uiam-2',
    });
    expect(api.createServiceAccount.mock.calls.map(([{ name, roles }]) => [name, roles])).toEqual([
      ['nightshift_agent', ['_nightshift_agent']],
      ['nightshift_automations', ['_nightshift_automations']],
    ]);
  });

  it('reuses existing accounts, so a second space gets the accounts of the first', async () => {
    const { api } = createApi();
    const first = await ensureNightshiftServiceAccounts(api, { isServerless: true });

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: true })).resolves.toEqual(
      first
    );
    expect(api.createServiceAccount).toHaveBeenCalledTimes(2);
  });

  it('reads every page of the account list', async () => {
    const others = Array.from({ length: 150 }, (_, i) => account({ name: `other_${i}` }));
    const { api } = createApi({
      accounts: [
        ...others,
        account({ name: 'nightshift_agent' }),
        account({ name: 'nightshift_automations' }),
      ],
    });

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: false })).resolves.toEqual({
      agent: 'id-nightshift_agent',
      automations: 'id-nightshift_automations',
    });
    expect(api.createServiceAccount).not.toHaveBeenCalled();
  });

  it('prefers an account Kibana can run as when several share the name', async () => {
    const { api } = createApi({
      accounts: [
        account({ name: 'nightshift_agent', id: 'unusable', assumable: false }),
        account({ name: 'nightshift_agent', id: 'usable' }),
        account({ name: 'nightshift_automations' }),
      ],
    });

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: true })).resolves.toEqual(
      expect.objectContaining({ agent: 'usable' })
    );
  });

  it('refuses an existing account Kibana cannot run as', async () => {
    const { api } = createApi({
      accounts: [account({ name: 'nightshift_agent', enabled: false })],
    });

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: false })).rejects.toEqual(
      expect.objectContaining({
        code: 'account_unusable',
        details: expect.objectContaining({ kind: 'agent' }),
      })
    );
  });

  it('refuses to create an account whose role is missing', async () => {
    const { api } = createApi({ roles: ['nightshift_agent'] });

    const error = await ensureNightshiftServiceAccounts(api, { isServerless: false }).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(NightshiftServiceAccountSetupError);
    expect(error).toMatchObject({
      code: 'role_missing',
      details: { kind: 'automations', role: 'nightshift_automations' },
    });
  });

  it('takes an account created concurrently when the name is taken', async () => {
    const { api, listed } = createApi({ createError: conflict });
    api.createServiceAccount.mockImplementation(
      async ({ name }: { name: string; roles: string[] }) => {
        listed.push(account({ name, id: `concurrent-${name}` }));
        throw conflict;
      }
    );

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: false })).resolves.toEqual({
      agent: 'concurrent-nightshift_agent',
      automations: 'concurrent-nightshift_automations',
    });
  });

  it('passes other create errors on', async () => {
    const { api } = createApi({ createError: new Error('boom') });

    await expect(ensureNightshiftServiceAccounts(api, { isServerless: false })).rejects.toThrow(
      'boom'
    );
  });
});

describe('createHttpServiceAccountsApi', () => {
  it('lists, reads roles and creates accounts through the security APIs', async () => {
    const request = jest.fn(async (path: string, { method }: { method: string }) => {
      if (path.startsWith('/api/security/role/')) {
        if (path.endsWith('_nightshift_automations')) {
          throw Object.assign(new Error('Not Found'), { status: 404 });
        }
        return {};
      }
      return method === 'GET' ? { serviceAccounts: [] } : { id: 'uiam-1' };
    });
    const api = createHttpServiceAccountsApi({
      request: request as Parameters<typeof createHttpServiceAccountsApi>[0]['request'],
      getStatus: (error) => (error as { status?: number }).status,
    });

    await expect(api.listServiceAccounts({ limit: 100 })).resolves.toEqual({
      serviceAccounts: [],
    });
    await expect(api.roleExists('_nightshift_agent')).resolves.toBe(true);
    await expect(api.roleExists('_nightshift_automations')).resolves.toBe(false);
    await expect(
      api.createServiceAccount({ name: 'nightshift_agent', description: 'd', roles: ['r'] })
    ).resolves.toEqual({ id: 'uiam-1' });
    expect(request).toHaveBeenLastCalledWith('/internal/security/service_account', {
      method: 'POST',
      body: JSON.stringify({ name: 'nightshift_agent', description: 'd', roles: ['r'] }),
    });
    expect(api.isConflict({ status: 409 })).toBe(true);
  });
});
