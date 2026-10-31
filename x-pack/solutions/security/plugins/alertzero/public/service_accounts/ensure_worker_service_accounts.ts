/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, HttpStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import {
  SECURITY_SERVICE_ACCOUNT_URL,
  SECURITY_ROLE_API_VERSION,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
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
  /**
   * The account each worker is already bound to, by worker ID. A binding whose account still
   * exists is kept; one whose account is gone is replaced, so a repeat run repairs it.
   */
  boundAccountIds?: ReadonlyMap<string, string>;
}

interface RoleResponse {
  metadata?: { _reserved?: unknown };
}

export type WorkerServiceAccountResult =
  /** `replacedBound` is set when the worker's bound account was gone and had to be replaced. */
  { ok: true; serviceAccountId: string; replacedBound?: boolean } | { ok: false; error: string };

const LIST_PAGE_SIZE = 100;
// A concurrent create lists an account before its credential is stored, so it reads as unusable
// for a moment. Waiting briefly lets the other create finish instead of reporting a false failure.
const CONFLICT_LOOKUP_ATTEMPTS = 5;
const CONFLICT_LOOKUP_DELAY_MS = 500;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const hasStatus = (error: unknown, status: number) =>
  isHttpFetchError(error) && error.response?.status === status;
const isConflict = (error: unknown) => hasStatus(error, 409);

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
type FindRole = (accountName: string) => Promise<string>;

/**
 * The roles ship built in: as Elasticsearch reserved roles on stateful and as predefined roles on
 * Serverless. Each is read by name, which on Serverless also finds roles hidden from the listing.
 */
const findBuiltInRole =
  (http: HttpStart, isServerless: boolean): FindRole =>
  async (accountName) => {
    const roleName = getWorkerRoleName(accountName, { isServerless });
    const missing = () =>
      new Error(
        isServerless ? i18n.predefinedRoleMissing(roleName) : i18n.reservedRoleMissing(roleName)
      );
    let role: RoleResponse;
    try {
      role = await http.get<RoleResponse>(buildSecurityRoleUrl(roleName), {
        version: SECURITY_ROLE_API_VERSION,
      });
    } catch (error) {
      throw hasStatus(error, 404) ? missing() : error;
    }
    if (role.metadata?._reserved !== true) throw missing();
    return roleName;
  };

const ensureOne = async (
  http: HttpStart,
  serviceAccounts: CoreServiceAccounts,
  findRole: FindRole,
  accounts: ServiceAccountEntry[],
  workerId: string,
  boundAccountId: string | undefined
): Promise<WorkerServiceAccountResult> => {
  const accountName = WORKER_SERVICE_ACCOUNT_NAMES[workerId];
  if (!accountName) return { ok: false, error: i18n.NO_PREBUILT_ROLE };

  const bound = boundAccountId && accounts.find(({ id }) => id === boundAccountId);
  if (bound) return toResult(bound);

  const replacedBound = Boolean(boundAccountId);
  const withReplaced = (result: WorkerServiceAccountResult): WorkerServiceAccountResult =>
    result.ok && replacedBound ? { ...result, replacedBound } : result;

  const existing = findByName(accounts, accountName);
  if (existing) return withReplaced(toResult(existing));

  try {
    const roleName = await findRole(accountName);
    const created = await serviceAccounts.create({
      name: accountName,
      description: i18n.accountDescription(roleName),
      roles: [roleName],
    });
    return withReplaced({ ok: true, serviceAccountId: created.id });
  } catch (error) {
    if (!isConflict(error)) return { ok: false, error: toMessage(error) };
    // Created concurrently, for example from another tab. A failed lookup is reported like any
    // other failure, so callers always get a result for this worker.
    return withReplaced(await awaitConcurrentAccount(http, accountName, error));
  }
};

const awaitConcurrentAccount = async (
  http: HttpStart,
  accountName: string,
  conflict: unknown
): Promise<WorkerServiceAccountResult> => {
  let result: WorkerServiceAccountResult = { ok: false, error: toMessage(conflict) };
  for (let attempt = 0; attempt < CONFLICT_LOOKUP_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(CONFLICT_LOOKUP_DELAY_MS);
    try {
      const concurrent = findByName(await listAccounts(http), accountName);
      if (!concurrent) return result;
      result = toResult(concurrent);
      if (result.ok) return result;
    } catch (listError) {
      return { ok: false, error: toMessage(listError) };
    }
  }
  return result;
};

/**
 * Finds or creates each worker's service account with the current user's privileges, giving it the
 * worker's built-in role. A worker whose built-in role is missing fails on its own. Existing
 * accounts are reused, never changed, and a binding to an account that no longer exists is
 * replaced.
 */
export const ensureWorkerServiceAccounts = async (
  http: HttpStart,
  serviceAccounts: CoreServiceAccounts | undefined,
  workerIds: readonly string[],
  { isServerless, boundAccountIds }: EnsureWorkerServiceAccountsOptions
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
        await ensureOne(
          http,
          serviceAccounts,
          findRole,
          accounts,
          workerId,
          boundAccountIds?.get(workerId)
        ),
      ]
    )
  );
  return new Map(results);
};
