/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import {
  buildSecurityRoleUrl,
  SECURITY_ROLE_API_VERSION,
  WORKER_ROLE_DEFINITIONS,
} from '@kbn/alertzero-plugin/common/worker_roles';
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

const ensureRole = async (fetch: HttpHandler, name: string, role: unknown): Promise<void> => {
  try {
    await fetch(buildSecurityRoleUrl(name), {
      method: 'PUT',
      version: SECURITY_ROLE_API_VERSION,
      headers: { ...XSRF, 'elastic-api-version': SECURITY_ROLE_API_VERSION },
      query: { createOnly: true },
      body: JSON.stringify(role),
    } satisfies HttpFetchOptions);
  } catch (error) {
    // Already exists: reused as is, never overwritten (same rule as the onboarding flow).
    if (statusOf(error) !== 409) throw error;
  }
};

/**
 * Finds or creates the prebuilt role and service account of each Worker (the
 * same definitions the onboarding "ensure worker service accounts" step uses),
 * as the eval user. Returns Worker id -> service account id. Fails loudly,
 * naming the Worker, when an account cannot be created or exists but is
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
    const definition = WORKER_ROLE_DEFINITIONS[workerId];
    if (!definition) {
      throw new Error(`No prebuilt role/service account definition for Worker "${workerId}".`);
    }
    let account = findUsable(accounts, definition.name);
    if (!account) {
      if (accounts.some((a) => a.name === definition.name)) {
        throw new Error(
          `Service account "${definition.name}" for Worker "${workerId}" exists but is disabled or not assumable.`
        );
      }
      try {
        await ensureRole(fetch, definition.name, definition.role);
        account = (await fetch(SECURITY_SERVICE_ACCOUNT_URL, {
          method: 'POST',
          headers: XSRF,
          body: JSON.stringify({
            name: definition.name,
            description: `AlertZero eval harness account for ${definition.name}`,
            roles: [definition.name],
          }),
        } satisfies HttpFetchOptions)) as ServiceAccountEntry;
      } catch (error) {
        if (statusOf(error) !== 409) {
          throw new Error(
            `Could not provision service account "${definition.name}" for Worker "${workerId}": ${
              error instanceof Error ? error.message : String(error)
            }. Is xpack.security.serviceAccounts.enabled=true on the stack?`
          );
        }
        // Created concurrently: re-read.
        accounts = await listAccounts(fetch);
        account = findUsable(accounts, definition.name);
        if (!account) throw error;
      }
    }
    result[workerId] = account.id;
  }
  return result;
};
