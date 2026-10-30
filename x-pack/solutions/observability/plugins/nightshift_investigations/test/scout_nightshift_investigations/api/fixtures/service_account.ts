/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, KibanaUrl, SamlAuth, ScoutLogger } from '@kbn/scout-oblt';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccountRoles,
  ensureNightshiftServiceAccounts,
  type InvestigatorServiceAccountStatus,
  type NightshiftServiceAccountIds,
} from '../../../../common';
import { COMMON_HEADERS } from './constants';

export const SERVICE_ACCOUNT_PATH = 'internal/nightshift/investigations/service_account';

/** Setup needs the workflows plugin ready, which a cold start can still be working on. */
const ENABLE_TIMEOUT_MS = 120_000;
const ENABLE_RETRY_INTERVAL_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Carries the status of a failed request, which the account setup reads for `404` and `409`. */
class ServiceAccountRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ServiceAccountRequestError';
  }
}

/**
 * Requests as the deployment's admin, who holds the `manage_security` that creating an account
 * and binding a workflow to it require.
 *
 * Plain `fetch` with the admin's session cookie, rather than `kbnClient`: that client always
 * authenticates with the deployment's native superuser, which UIAM rejects on Serverless with
 * "Provided credential is not compatible with UIAM".
 */
const createAdminRequester =
  (kbnUrl: KibanaUrl, cookieHeader: Record<string, string>) =>
  async <T>(
    path: string,
    {
      method,
      query,
      body,
      version,
    }: {
      method: 'GET' | 'POST';
      query?: Record<string, string | number>;
      body?: string;
      version?: string;
    }
  ): Promise<T> => {
    const url = new URL(kbnUrl.get(path.startsWith('/') ? path : `/${path}`));
    Object.entries(query ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    const response = await fetch(url, {
      method,
      headers: {
        ...COMMON_HEADERS,
        ...cookieHeader,
        'content-type': 'application/json',
        ...(version ? { 'elastic-api-version': version } : {}),
      },
      ...(body ? { body } : {}),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new ServiceAccountRequestError(
        `[${method} ${path}] ${response.status}: ${text}`,
        response.status
      );
    }
    return (text ? JSON.parse(text) : undefined) as T;
  };

/**
 * Finds or creates the deployment's Nightshift service accounts as the admin, exactly as the app's
 * setup step does, role lookup included.
 */
const ensureServiceAccounts = (
  request: ReturnType<typeof createAdminRequester>,
  { isServerless }: { isServerless: boolean }
): Promise<NightshiftServiceAccountIds> =>
  ensureNightshiftServiceAccounts(
    createHttpServiceAccountsApi({
      request,
      getStatus: (error) => (error as { status?: number })?.status,
    }),
    { isServerless }
  );

/** Reads whether the space is set up, as the Nightshift app does. */
export const getNightshiftServiceAccountStatus = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>
): Promise<InvestigatorServiceAccountStatus> => {
  const { body } = await apiClient.get<InvestigatorServiceAccountStatus>(SERVICE_ACCOUNT_PATH, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });
  return body;
};

/** Sets the space up with the given accounts, retrying while the workflows plugin starts up. */
const enableNightshiftServiceAccount = async (
  request: ReturnType<typeof createAdminRequester>,
  serviceAccountIds: NightshiftServiceAccountIds,
  log: ScoutLogger
): Promise<InvestigatorServiceAccountStatus> => {
  const deadline = Date.now() + ENABLE_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    try {
      const status = await request<InvestigatorServiceAccountStatus>(
        `${SERVICE_ACCOUNT_PATH}/_enable`,
        { method: 'POST', body: JSON.stringify({ serviceAccountIds }) }
      );
      if (status.installed && status.bound) {
        return status;
      }
      last = `installed=${status.installed} bound=${status.bound}`;
    } catch (error) {
      last = String(error);
    }
    log.debug(`Nightshift setup is not ready yet, retrying. Last result ${last}`);
    await sleep(ENABLE_RETRY_INTERVAL_MS);
  }
  throw new Error(
    `The Nightshift service account setup did not finish within ${ENABLE_TIMEOUT_MS}ms. Last result ${last}`
  );
};

/**
 * Sets the default space up to run investigations: the roles on stateful, the shared accounts,
 * and the space's bound workflows. Serverless gets its `_`-prefixed roles from
 * elasticsearch-controller, so only stateful creates them.
 *
 * Runs once for the whole suite (`global.setup.ts`), not per worker: the accounts are shared by
 * the deployment, and concurrent creates of the same account conflict.
 */
export const setUpNightshiftServiceAccount = async ({
  kbnUrl,
  esClient,
  samlAuth,
  isServerless,
  log,
}: {
  kbnUrl: KibanaUrl;
  esClient: EsClient;
  samlAuth: SamlAuth;
  isServerless: boolean;
  log: ScoutLogger;
}): Promise<InvestigatorServiceAccountStatus> => {
  await ensureNightshiftServiceAccountRoles(esClient, { isServerless });
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const request = createAdminRequester(kbnUrl, cookieHeader);
  const serviceAccountIds = await ensureServiceAccounts(request, { isServerless });
  const status = await enableNightshiftServiceAccount(request, serviceAccountIds, log);
  log.info(`Nightshift runs as [${status.serviceAccountId}] in the default space`);
  return status;
};
