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
  esArchiversPath,
  esResourcesEndpoint,
  internalApiHeaders,
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

apiTest.describe(
  'Profiling status with Universal Profiling data',
  { tag: tags.stateful.classic },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, profilingHelper, profilingSetup }) => {
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

      adminApiCredentials = await requestAuth.getApiKey('admin');
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
    });

    apiTest('matches the Universal Profiling setup status', async ({ apiClient }) => {
      for (const credentials of [adminApiCredentials, viewerApiCredentials]) {
        const [status, setupStatus] = await Promise.all([
          get(apiClient, profilingApiEndpoints.status, credentials),
          get(apiClient, esResourcesEndpoint, credentials),
        ]);

        expect(status).toStrictEqual({
          isEnabled: setupStatus.profiling_enabled,
          otel: { isAvailable: true, hasData: false },
          universalProfiling: {
            isAvailable: true,
            hasSetup: setupStatus.has_setup,
            hasData: setupStatus.has_data,
            hasLegacyData: setupStatus.pre_8_9_1_data,
            canSetup: setupStatus.has_required_role,
          },
        });
      }
    });
  }
);
