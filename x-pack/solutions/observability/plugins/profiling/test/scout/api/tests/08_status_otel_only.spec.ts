/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import {
  esResourcesEndpoint,
  internalApiHeaders,
  OTEL_PROFILING_EVENTS_DATA_STREAM,
  profilingApiEndpoints,
} from '../../common/fixtures/constants';

const get = async (
  apiClient: ApiClientFixture,
  endpoint: string,
  credentials: RoleApiCredentials
) => {
  const res = await apiClient.get(endpoint, {
    headers: { ...credentials.apiKeyHeader, ...internalApiHeaders },
    responseType: 'json',
  });
  expect(res.statusCode).toBe(200);
  return res.body;
};

apiTest.describe('Profiling status with OTel data only', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, profilingSetup, esClient }) => {
    await profilingSetup.cleanup();

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

    adminApiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest.afterAll(async ({ profilingSetup }) => {
    // Also deletes the OTel data streams, which match `profiling-*`.
    await profilingSetup.cleanup();
  });

  apiTest('reports OTel data', async ({ apiClient }) => {
    const status = await get(apiClient, profilingApiEndpoints.status, adminApiCredentials);

    expect(status.isEnabled).toBe(true);
    expect(status.otel).toStrictEqual({ isAvailable: true, hasData: true });
    expect(status.universalProfiling.hasData).toBe(false);
  });

  apiTest(
    'does not report OTel data as Universal Profiling data on the setup status',
    async ({ apiClient }) => {
      const setupStatus = await get(apiClient, esResourcesEndpoint, adminApiCredentials);

      expect(setupStatus.has_data).toBe(false);
    }
  );
});
