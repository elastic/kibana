/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApiClientFixture, RoleApiCredentials, RoleSessionCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import {
  esArchiversPath,
  esResourcesEndpoint,
  internalApiHeaders,
  OTEL_PROFILING_EVENTS_DATA_STREAM,
  profilingApiEndpoints,
} from '../../common/fixtures/constants';

const ROLES = ['admin', 'viewer'] as const;

// The internal status endpoint is called with an interactive session, as the profiling UI does,
// and the public setup endpoint with an API key.
interface RoleCredentials {
  role: (typeof ROLES)[number];
  session: RoleSessionCredentials;
  apiKey: RoleApiCredentials;
}

const get = async (
  apiClient: ApiClientFixture,
  endpoint: string,
  authHeaders: Record<string, string>
) => {
  const res = await apiClient.get(endpoint, {
    headers: { ...authHeaders, ...internalApiHeaders },
    responseType: 'json',
  });
  expect(res.statusCode).toBe(200);
  return res.body;
};

apiTest.describe('Profiling status', { tag: tags.stateful.classic }, () => {
  let credentialsByRole: RoleCredentials[];

  apiTest.beforeAll(
    async ({ requestAuth, samlAuth, profilingHelper, profilingSetup, esClient }) => {
      let status = await profilingSetup.checkStatus();

      if (!status.has_setup) {
        await profilingHelper.installPolicies();
        await profilingSetup.setupResources();
      }

      if (!status.has_data) {
        await profilingSetup.loadData(esArchiversPath);
      }

      status = await profilingSetup.checkStatus();
      expect(status.has_setup).toBe(true);
      expect(status.has_data).toBe(true);

      await esClient.index({
        index: OTEL_PROFILING_EVENTS_DATA_STREAM,
        op_type: 'create',
        refresh: true,
        document: {
          '@timestamp': new Date().toISOString(),
          'stacktrace.id': 'S07KmaoGhvNte78xwwRbZQ',
          count: 1,
        },
      });

      credentialsByRole = await Promise.all(
        ROLES.map(async (role) => ({
          role,
          session: await samlAuth.asInteractiveUser(role),
          apiKey: await requestAuth.getApiKey(role),
        }))
      );
    }
  );

  apiTest('matches the Universal Profiling setup status', async ({ apiClient }) => {
    for (const { session, apiKey } of credentialsByRole) {
      const [status, setupStatus] = await Promise.all([
        get(apiClient, profilingApiEndpoints.status, session.cookieHeader),
        get(apiClient, esResourcesEndpoint, apiKey.apiKeyHeader),
      ]);

      expect(status).toStrictEqual({
        isEnabled: setupStatus.profiling_enabled,
        otel: status.otel, // We don't care about OTEL values in this test, so just pass them through
        universalProfiling: {
          isAvailable: true,
          hasSetup: setupStatus.has_setup,
          hasData: setupStatus.has_data,
          hasLegacyData: setupStatus.pre_8_9_1_data,
          // Universal Profiling is set up, so the setup privileges (`canSetup`) aren't reported
        },
      });
    }
  });

  apiTest('reports OTel data', async ({ apiClient }) => {
    for (const { session } of credentialsByRole) {
      const status = await get(apiClient, profilingApiEndpoints.status, session.cookieHeader);

      expect(status.isEnabled).toBe(true);
      expect(status.otel).toStrictEqual({ isAvailable: true, hasData: true });
    }
  });
});
