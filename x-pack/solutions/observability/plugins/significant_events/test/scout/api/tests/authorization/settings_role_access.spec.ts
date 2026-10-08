/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import {
  CONFIGURE_ONLY_REQUESTS,
  RUN_QUOTAS_ENDPOINT,
  type RunQuotaLimits,
} from '../../fixtures/built_in_role_access';

// Settings need `configure_nightshift`, which only the "Manage engines" sub-feature grants.
// Base privileges exclude it, so only the built-in admin role has it.
apiTest.describe(
  'Significant Events settings access for built-in roles',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    for (const role of ['viewer', 'editor'] as const) {
      apiTest(`denies settings changes to the ${role} role`, async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(role);
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        for (const { method, path } of CONFIGURE_ONLY_REQUESTS) {
          const response = await apiClient[method](path, {
            headers,
            body: {},
            responseType: 'json',
          });
          expect(response, `${method.toUpperCase()} ${path}`).toHaveStatusCode(403);
        }
      });
    }

    apiTest('allows the admin role to change settings', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...COMMON_API_HEADERS, ...cookieHeader };
      const readResponse = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
        headers,
        responseType: 'json',
      });
      expect(readResponse).toHaveStatusCode(200);
      const { enabled, limits }: RunQuotaLimits = readResponse.body;
      const nextDetectionLimit =
        limits.detection === 10_000 ? limits.detection - 1 : limits.detection + 1;

      const updateResponse = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
        headers,
        body: { limits: { detection: nextDetectionLimit } },
        responseType: 'json',
      });
      const restoreResponse = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
        headers,
        body: { enabled, limits },
        responseType: 'json',
      });

      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body).toMatchObject({
        limits: { ...limits, detection: nextDetectionLimit },
        canManage: true,
      });
      expect(restoreResponse).toHaveStatusCode(200);
    });
  }
);
