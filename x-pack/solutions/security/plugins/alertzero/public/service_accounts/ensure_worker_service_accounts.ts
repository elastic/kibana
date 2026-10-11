/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { SECURITY_SERVICE_ACCOUNT_URL } from '@kbn/alertzero-common';
import {
  SECURITY_ROLES_URL,
  SECURITY_ROLE_API_VERSION,
  WORKER_ROLE_DEFINITIONS,
  getWorkerRoleName,
  type WorkerRoleDefinition,
} from '../../common/worker_roles';
import * as i18n from './translations';

export type CoreServiceAccounts = CoreStart['security']['serviceAccounts'];

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

interface ListServiceAccountsResponse {
  serviceAccounts: ServiceAccountEntry[];
  nextPage?: string;
}

export interface EnsureWorkerServiceAccountsOptions {
  isServerless: boolean;
}

interface RoleEntry {
  name: string;
  metadata?: { _reserved?: unknown };
}

export type WorkerServiceAccountResult =
  | { ok: true; serviceAccountId: string }
  | { ok: false; error: string };

const LIST_PAGE_SIZE = 100;

const isConflict = (error: unknown) => isHttpFetchError(error) && error.response?.status === 409;

const toMessage = (error: unknown): string => {
  const body = isHttpFetchError(error)
    ? (error.body as { message?: unknown } | undefined)
    : undefined;
  if (typeof body?.message === 'string') return body.message;
  return error instanceof Error ? error.message : String(error);
};

const listAccounts = async (http: HttpStart): Promise<ServiceAccountEntry[]> => {
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page: ListServiceAccountsResponse = await http.get(SECURITY_SERVICE_ACCOUNT_URL, {
      query: { limit: LIST_PAGE_SIZE, ...(after ? { after } : {}) },
    });
    accounts.push(...page.serviceAccounts);
    after = page.nextPage;
  } while (after);
  return accounts;
};

/** UIAM allows several accounts with one name, so prefer one Kibana can run as. */
const findByName = (accounts: ServiceAccountEntry[], name: string) => {
  const matches = accounts.filter((account) => account.name === name);
  return matches.find((account) => account.enabled && account.assumable) ?? matches[0];
};

const toResult = (account: ServiceAccountEntry): WorkerServiceAccountResult =>
  account.enabled && account.assumable
    ? { ok: true, serviceAccountId: account.id }
    : { ok: false, error: i18n.accountUnusable(account.name) };

/** Returns the name of the worker's built-in role, or throws if this deployment lacks it. */
type FindRole = (definition: WorkerRoleDefinition) => Promise<string>;

/**
 * The roles ship built in: as Elasticsearch reserved roles on stateful and as predefined roles on
 * Serverless, where only the reserved-roles listing returns them. Listed once per call.
 */
const findBuiltInRole = (http: HttpStart, isServerless: boolean): FindRole => {
  let reservedRoleNames: Promise<Set<string>> | undefined;
  return async ({ name }) => {
    reservedRoleNames ??= http
      .get<RoleEntry[]>(SECURITY_ROLES_URL, {
        version: SECURITY_ROLE_API_VERSION,
        query: { includeReservedRoles: true },
      })
      .then(
        (roles) =>
          new Set(
            roles
              .filter(({ metadata }) => metadata?._reserved === true)
              .map(({ name: reservedName }) => reservedName)
          )
      );
    const roleName = getWorkerRoleName(name, { isServerless });
    if (!(await reservedRoleNames).has(roleName)) {
      throw new Error(
        isServerless ? i18n.predefinedRoleMissing(roleName) : i18n.reservedRoleMissing(roleName)
      );
    }
    return roleName;
  };
};

const ensureOne = async (
  http: HttpStart,
  serviceAccounts: CoreServiceAccounts,
  findRole: FindRole,
  accounts: ServiceAccountEntry[],
  workerId: string
): Promise<WorkerServiceAccountResult> => {
  const definition = WORKER_ROLE_DEFINITIONS[workerId];
  if (!definition) return { ok: false, error: i18n.NO_PREBUILT_ROLE };

  const existing = findByName(accounts, definition.name);
  if (existing) return toResult(existing);

  try {
    const roleName = await findRole(definition);
    const created = await serviceAccounts.create({
      name: definition.name,
      description: i18n.accountDescription(roleName),
      roles: [roleName],
    });
    return { ok: true, serviceAccountId: created.id };
  } catch (error) {
    if (!isConflict(error)) return { ok: false, error: toMessage(error) };
    // Created concurrently, for example from another tab. A failed lookup is reported like any
    // other failure, so callers always get a result for this worker.
    return listAccounts(http).then(
      (current): WorkerServiceAccountResult => {
        const concurrent = findByName(current, definition.name);
        return concurrent ? toResult(concurrent) : { ok: false, error: toMessage(error) };
      },
      (listError): WorkerServiceAccountResult => ({ ok: false, error: toMessage(listError) })
    );
  }
};

/**
 * Finds or creates each worker's service account with the current user's privileges, giving it the
 * worker's built-in role. A worker whose built-in role is missing fails on its own. Existing
 * accounts are reused, never changed.
 */
export const ensureWorkerServiceAccounts = async (
  http: HttpStart,
  serviceAccounts: CoreServiceAccounts | undefined,
  workerIds: readonly string[],
  { isServerless }: EnsureWorkerServiceAccountsOptions
): Promise<Map<string, WorkerServiceAccountResult>> => {
  const failAll = (error: string) =>
    new Map(
      workerIds.map((id): [string, WorkerServiceAccountResult] => [id, { ok: false, error }])
    );

  if (workerIds.length === 0) return new Map();
  if (!serviceAccounts?.isEnabled()) return failAll(i18n.SERVICE_ACCOUNTS_DISABLED);

  let accounts: ServiceAccountEntry[];
  try {
    accounts = await listAccounts(http);
  } catch (error) {
    return failAll(toMessage(error));
  }

  const findRole = findBuiltInRole(http, isServerless);
  const results = await Promise.all(
    workerIds.map(
      async (workerId): Promise<[string, WorkerServiceAccountResult]> => [
        workerId,
        await ensureOne(http, serviceAccounts, findRole, accounts, workerId),
      ]
    )
  );
  return new Map(results);
};
