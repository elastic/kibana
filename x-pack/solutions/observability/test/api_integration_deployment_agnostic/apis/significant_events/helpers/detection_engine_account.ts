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
import type { RoleScopedSupertestProvider } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';

type EsClient = Parameters<typeof ensureNightshiftServiceAccountRoles>[0];

const ENABLE_PATH = '/internal/significant_events/service_account/_enable';

/** Carries the status of a failed request, which the account setup reads for `404` and `409`. */
class RequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

/**
 * Binds the default space's detection engine to its service account, as the admin. Rules are
 * created and enabled as that account, and a space that is not set up refuses them with 503.
 * Idempotent: the account and the binding are reused when they exist.
 */
export async function setUpDetectionEngineAccount({
  roleScopedSupertest,
  esClient,
  isServerless,
}: {
  roleScopedSupertest: ReturnType<typeof RoleScopedSupertestProvider>;
  esClient: EsClient;
  isServerless: boolean;
}): Promise<void> {
  // Serverless gets its `_`-prefixed roles from elasticsearch-controller; only stateful creates them.
  await ensureNightshiftServiceAccountRoles(esClient, { isServerless });

  const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
    useCookieHeader: true,
    withInternalHeaders: true,
  });

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
    let call = (method === 'GET' ? supertest.get(path) : supertest.post(path))
      .set('kbn-xsrf', 'foo')
      .set('x-elastic-internal-origin', 'kibana');
    if (version) call = call.set('elastic-api-version', version);
    if (query) call = call.query(query);
    if (body) call = call.set('content-type', 'application/json').send(body);
    const response = await call;
    if (response.status >= 400) {
      throw new RequestError(
        `[${method} ${path}] ${response.status}: ${response.text}`,
        response.status
      );
    }
    return response.body as T;
  };

  const serviceAccountId = await ensureNightshiftServiceAccount(
    createHttpServiceAccountsApi({
      request,
      getStatus: (error) => (error as { status?: number })?.status,
    }),
    { kind: 'detection', isServerless }
  );

  await request(ENABLE_PATH, { method: 'POST', body: JSON.stringify({ serviceAccountId }) });
}
