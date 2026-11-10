/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccount,
  ensureNightshiftServiceAccountRoles,
} from '@kbn/nightshift-shared';
import type { EsClient, KibanaUrl, SamlAuth, ScoutLogger } from '@kbn/scout-oblt';
import { COMMON_API_HEADERS } from './constants';

const ENABLE_PATH = '/internal/significant_events/service_account/_enable';

/** Carries the status of a failed request, which the account setup reads for `404` and `409`. */
class RequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'RequestError';
  }
}

/**
 * Binds the default space's detection engine to its service account, as the admin. Rules are
 * created and enabled as that account, so a space that is not set up refuses them with 503.
 * Idempotent: the account and the binding are reused when they exist.
 *
 * Plain `fetch` with the admin's session cookie, rather than `kbnClient`: that client always
 * authenticates with the deployment's native superuser, which UIAM rejects on Serverless.
 * Serverless gets its `_`-prefixed roles from elasticsearch-controller, so only stateful
 * creates them.
 */
export const setUpDetectionEngineAccount = async ({
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
}): Promise<void> => {
  await ensureNightshiftServiceAccountRoles(esClient, { isServerless });
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

  const request = async <T>(
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
        ...COMMON_API_HEADERS,
        ...cookieHeader,
        'content-type': 'application/json',
        ...(version ? { 'elastic-api-version': version } : {}),
      },
      ...(body ? { body } : {}),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new RequestError(`[${method} ${path}] ${response.status}: ${text}`, response.status);
    }
    return (text ? JSON.parse(text) : undefined) as T;
  };

  const serviceAccountId = await ensureNightshiftServiceAccount(
    createHttpServiceAccountsApi({
      request,
      getStatus: (error) => (error as { status?: number })?.status,
    }),
    { kind: 'detection', isServerless }
  );
  await request(ENABLE_PATH, { method: 'POST', body: JSON.stringify({ serviceAccountId }) });
  log.info(`Significant events detection runs as [${serviceAccountId}] in the default space`);
};
