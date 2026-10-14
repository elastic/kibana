/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import {
  SECURITY_ROLE_API_VERSION,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import { SECURITY_SERVICE_ACCOUNT_URL } from './constants';

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

const LIST_PAGE_SIZE = 100;
const XSRF = { 'kbn-xsrf': 'true' };

const statusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status, response } = error as { status?: unknown; response?: { status?: unknown } };
  const code = typeof status === 'number' ? status : response?.status;
  return typeof code === 'number' ? code : undefined;
};

const listAccounts = async (fetch: HttpHandler): Promise<ServiceAccountEntry[]> => {
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page = (await fetch(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'GET',
      headers: XSRF,
      query: { limit: LIST_PAGE_SIZE, ...(after ? { after } : {}) },
    } satisfies HttpFetchOptions)) as ListServiceAccountsResponse;
    accounts.push(...page.serviceAccounts);
    after = page.nextPage;
  } while (after);
  return accounts;
};

/** Several accounts can share a name: prefer one Kibana can run as. */
const findUsable = (accounts: readonly ServiceAccountEntry[], name: string) =>
  accounts.find((a) => a.name === name && a.enabled && a.assumable);

const isServerlessDeployment = async (fetch: HttpHandler): Promise<boolean> => {
  const status = (await fetch('/api/status', { method: 'GET' })) as {
    version?: { build_flavor?: string };
  };
  return status.version?.build_flavor === 'serverless';
};

/**
 * The Worker roles are built in: Elasticsearch reserved roles on stateful, predefined roles on
 * Serverless. The harness only looks one up and never creates or changes it.
 */
const findBuiltInRole = async (
  fetch: HttpHandler,
  accountName: string,
  isServerless: boolean
): Promise<string> => {
  const roleName = getWorkerRoleName(accountName, { isServerless });
  const missing = () =>
    new Error(
      `Built-in ${
        isServerless ? 'predefined' : 'reserved'
      } role "${roleName}" is missing on this ` +
        'stack; the eval harness does not create Worker roles.'
    );
  let role: { metadata?: { _reserved?: unknown } };
  try {
    role = (await fetch(buildSecurityRoleUrl(roleName), {
      method: 'GET',
      version: SECURITY_ROLE_API_VERSION,
      headers: { ...XSRF, 'elastic-api-version': SECURITY_ROLE_API_VERSION },
    } satisfies HttpFetchOptions)) as { metadata?: { _reserved?: unknown } };
  } catch (error) {
    throw statusOf(error) === 404 ? missing() : error;
  }
  if (role.metadata?._reserved !== true) throw missing();
  return roleName;
};

/**
 * Finds or creates the service account of each Worker, bound to the Worker's built-in role (the
 * same lookup the onboarding "ensure worker service accounts" step uses), as the eval user.
 * Returns Worker id -> service account id. Fails loudly, naming the missing role, when the stack
 * lacks it, and naming the Worker, when an account cannot be created or exists but is
 * disabled / not assumable; a fresh stack has none, so the harness cannot rely
 * on a pre-seeded `ALERTZERO_EVAL_SERVICE_ACCOUNT_ID`.
 */
export const provisionWorkerServiceAccounts = async (
  fetch: HttpHandler,
  workerIds: readonly string[]
): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  let accounts = await listAccounts(fetch);
  for (const workerId of workerIds) {
    const accountName = WORKER_SERVICE_ACCOUNT_NAMES[workerId];
    if (!accountName) {
      throw new Error(`No built-in role/service account for Worker "${workerId}".`);
    }
    let account = findUsable(accounts, accountName);
    if (!account) {
      if (accounts.some((a) => a.name === accountName)) {
        throw new Error(
          `Service account "${accountName}" for Worker "${workerId}" exists but is disabled or not assumable.`
        );
      }
      const roleName = await findBuiltInRole(
        fetch,
        accountName,
        await isServerlessDeployment(fetch)
      );
      try {
        account = (await fetch(SECURITY_SERVICE_ACCOUNT_URL, {
          method: 'POST',
          headers: XSRF,
          body: JSON.stringify({
            name: accountName,
            description: `AlertZero eval harness account for ${accountName}`,
            roles: [roleName],
          }),
        } satisfies HttpFetchOptions)) as ServiceAccountEntry;
      } catch (error) {
        if (statusOf(error) !== 409) {
          throw new Error(
            `Could not provision service account "${accountName}" for Worker "${workerId}": ${
              error instanceof Error ? error.message : String(error)
            }. Is xpack.security.serviceAccounts.enabled=true on the stack?`
          );
        }
        // Created concurrently: re-read.
        accounts = await listAccounts(fetch);
        account = findUsable(accounts, accountName);
        if (!account) throw error;
      }
    }
    result[workerId] = account.id;
  }
  return result;
};
