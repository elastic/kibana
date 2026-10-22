/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getNightshiftRoleName,
  getNightshiftServiceAccountName,
  type NightshiftServiceAccountIds,
  type NightshiftServiceAccountKind,
} from './service_account';

/** Lists and creates service accounts, and reads roles: `/internal/security/service_account`. */
export const SECURITY_SERVICE_ACCOUNT_URL = '/internal/security/service_account';
/** Reads a role by name, which on Serverless also finds predefined roles hidden from the listing. */
export const getSecurityRoleUrl = (roleName: string): string =>
  `/api/security/role/${encodeURIComponent(roleName)}`;
export const SECURITY_ROLE_API_VERSION = '2023-10-31';

/** An account as `GET /internal/security/service_account` lists it. */
export interface ListedServiceAccount {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

/** One page of `GET /internal/security/service_account`. */
export interface ListedServiceAccountsPage {
  serviceAccounts: ListedServiceAccount[];
  nextPage?: string;
}

/**
 * How the caller talks to the security APIs: the browser's `http` and core's service accounts
 * client in the app, Kibana's HTTP API in tests and evals. Every call acts as the current user,
 * who needs `manage_security`.
 */
export interface NightshiftServiceAccountsApi {
  listServiceAccounts: (query: {
    limit: number;
    after?: string;
  }) => Promise<ListedServiceAccountsPage>;
  /** False when the role does not exist. */
  roleExists: (roleName: string) => Promise<boolean>;
  createServiceAccount: (params: {
    name: string;
    description: string;
    roles: string[];
  }) => Promise<{ id: string }>;
  /** Whether a create failed because an account with the name exists (stateful only). */
  isConflict: (error: unknown) => boolean;
}

/**
 * {@link NightshiftServiceAccountsApi} over a Kibana HTTP client, for tests and evals that set a
 * space up through the API. `request` resolves to the response body and rejects on an error
 * status, which `getStatus` reads.
 */
export const createHttpServiceAccountsApi = ({
  request,
  getStatus,
}: {
  request: <T>(
    path: string,
    options: {
      method: 'GET' | 'POST';
      query?: Record<string, string | number>;
      body?: string;
      version?: string;
    }
  ) => Promise<T>;
  getStatus: (error: unknown) => number | undefined;
}): NightshiftServiceAccountsApi => ({
  listServiceAccounts: (query) =>
    request<ListedServiceAccountsPage>(SECURITY_SERVICE_ACCOUNT_URL, { method: 'GET', query }),
  roleExists: async (roleName) => {
    try {
      await request(getSecurityRoleUrl(roleName), {
        method: 'GET',
        version: SECURITY_ROLE_API_VERSION,
      });
      return true;
    } catch (error) {
      if (getStatus(error) === 404) return false;
      throw error;
    }
  },
  createServiceAccount: (params) =>
    request<{ id: string }>(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  isConflict: (error) => getStatus(error) === 409,
});

export type NightshiftServiceAccountSetupErrorCode =
  /** The deployment lacks the role the account must hold. */
  | 'role_missing'
  /** An account with the name exists, but Kibana cannot run as it. */
  | 'account_unusable';

/** Why the accounts could not be found or created, for the caller to explain. */
export class NightshiftServiceAccountSetupError extends Error {
  constructor(
    public readonly code: NightshiftServiceAccountSetupErrorCode,
    public readonly details: { kind: NightshiftServiceAccountKind; name: string; role: string }
  ) {
    super(
      code === 'role_missing'
        ? `The role [${details.role}] for the Nightshift service account [${details.name}] does not exist.`
        : `The service account [${details.name}] exists, but Kibana cannot run as it.`
    );
    this.name = 'NightshiftServiceAccountSetupError';
  }
}

const LIST_PAGE_SIZE = 100;

const DESCRIPTION: Record<NightshiftServiceAccountKind, string> = {
  agent: 'Runs Nightshift investigations, their sandbox tools and learning hooks.',
  automations: 'Runs Nightshift automations, which start investigations.',
};

const listAll = async (api: NightshiftServiceAccountsApi): Promise<ListedServiceAccount[]> => {
  const accounts: ListedServiceAccount[] = [];
  let after: string | undefined;
  do {
    const page = await api.listServiceAccounts({
      limit: LIST_PAGE_SIZE,
      ...(after ? { after } : {}),
    });
    accounts.push(...page.serviceAccounts);
    after = page.nextPage;
  } while (after);
  return accounts;
};

const isUsable = ({ enabled, assumable }: ListedServiceAccount) => enabled && assumable;

/** UIAM allows several accounts with one name, so prefer one Kibana can run as. */
const findByName = (accounts: ListedServiceAccount[], name: string) => {
  const matches = accounts.filter((account) => account.name === name);
  return matches.find(isUsable) ?? matches[0];
};

/**
 * Finds the deployment's Nightshift service accounts by name, and creates the missing ones with
 * their roles, as the current user. Returns the ids the backend assigned. Existing accounts are
 * reused, never changed, so setting up a second space reuses the accounts of the first.
 *
 * Throws a {@link NightshiftServiceAccountSetupError} when an account cannot be used or its role
 * is missing, and the API's own error otherwise.
 */
export const ensureNightshiftServiceAccounts = async (
  api: NightshiftServiceAccountsApi,
  { isServerless }: { isServerless: boolean }
): Promise<NightshiftServiceAccountIds> => {
  const accounts = await listAll(api);

  const ensureOne = async (kind: NightshiftServiceAccountKind): Promise<string> => {
    const name = getNightshiftServiceAccountName(kind);
    const role = getNightshiftRoleName(kind, { isServerless });
    const toId = (account: ListedServiceAccount): string => {
      if (!isUsable(account)) {
        throw new NightshiftServiceAccountSetupError('account_unusable', { kind, name, role });
      }
      return account.id;
    };

    const existing = findByName(accounts, name);
    if (existing) return toId(existing);

    if (!(await api.roleExists(role))) {
      throw new NightshiftServiceAccountSetupError('role_missing', { kind, name, role });
    }
    try {
      const { id } = await api.createServiceAccount({
        name,
        description: `${DESCRIPTION[kind]} Created by Nightshift.`,
        roles: [role],
      });
      return id;
    } catch (error) {
      // Created concurrently (a name is unique on stateful), for example from another space.
      if (!api.isConflict(error)) throw error;
      const concurrent = findByName(await listAll(api), name);
      if (!concurrent) throw error;
      return toId(concurrent);
    }
  };

  return { agent: await ensureOne('agent'), automations: await ensureOne('automations') };
};
