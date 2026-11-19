/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  EsClient,
  KibanaUrl,
  SamlAuth,
  ScoutLogger,
} from '@kbn/scout-oblt';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccount,
  ensureNightshiftServiceAccountRoles,
  NIGHTSHIFT_ENABLED_FLAG,
} from '@kbn/nightshift-shared';
import type {
  DetectionEngineEnableBody,
  DetectionEngineEnableResponse,
} from '../../../../common/service_account';

export { apiTest } from '@kbn/scout-oblt';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const TICK_PATH = 'internal/nightshift/detection/_tick';
const ENABLE_PATH = '/internal/nightshift/detection/service_account/_enable';

/** Setup needs the workflows plugin ready, which a cold start can still be working on. */
const ENABLE_TIMEOUT_MS = 120_000;
const ENABLE_RETRY_INTERVAL_MS = 5_000;

/** The HTTP status `createAdminRequester` attaches to the errors it throws. */
const getRequestStatus = (error: unknown): number | undefined =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number'
    ? error.status
    : undefined;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The engine is gated on the nightshift.enabled flag. Overrides only work where
 * coreApp.allowDynamicConfigOverrides is set, which Scout's local configs do.
 */
export const setNightshiftEnabled = (apiServices: ApiServicesFixture, enabled: boolean | null) =>
  apiServices.core.settings({ 'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: enabled } });

/**
 * Requests as the deployment's admin, who holds the `manage_security` that creating an account and
 * binding a workflow to it require. Plain `fetch` with the admin's session cookie, because
 * `kbnClient` authenticates as the native superuser, which UIAM rejects on Serverless.
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
    const url = new URL(kbnUrl.get(path));
    Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
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
      throw Object.assign(new Error(`[${method} ${path}] ${response.status}: ${text}`), {
        status: response.status,
      });
    }
    return (text ? JSON.parse(text) : undefined) as T;
  };

/**
 * Sets the default space up to run the detection engine: the role on stateful (Serverless gets
 * `_nightshift_detection` from elasticsearch-controller), the deployment's detection account, and
 * the space's binding and engine workflow. Once for the whole suite: the account belongs to the
 * deployment, and two workers creating it at once conflict.
 */
export const setUpDetectionEngine = async ({
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
}): Promise<DetectionEngineEnableResponse> => {
  await ensureNightshiftServiceAccountRoles(esClient, { isServerless });
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const request = createAdminRequester(kbnUrl, cookieHeader);
  const serviceAccountId = await ensureNightshiftServiceAccount(
    createHttpServiceAccountsApi({
      request,
      getStatus: getRequestStatus,
    }),
    { kind: 'detection', isServerless }
  );

  const body: DetectionEngineEnableBody = { serviceAccountId };
  const deadline = Date.now() + ENABLE_TIMEOUT_MS;
  let last = '';
  while (Date.now() < deadline) {
    try {
      return await request<DetectionEngineEnableResponse>(ENABLE_PATH, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (error) {
      last = String(error);
    }
    log.debug(`Detection engine setup is not ready yet, retrying. Last error ${last}`);
    await sleep(ENABLE_RETRY_INTERVAL_MS);
  }
  throw new Error(
    `The detection engine setup did not finish within ${ENABLE_TIMEOUT_MS}ms. Last error ${last}`
  );
};
