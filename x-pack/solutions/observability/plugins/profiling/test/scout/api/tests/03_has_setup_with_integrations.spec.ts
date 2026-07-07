/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import { esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe('Collector integration is not installed', { tag: tags.stateful.classic }, () => {
  let viewerApiCreditials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, profilingSetup, profilingHelper }) => {
    // Start from a clean data state so `has_data` is false for these assertions.
    await profilingSetup.cleanup();
    // Ensure the collector + symbolizer policies exist so the tests below can delete them.
    // setupResources is fast here because the bundled packages were already installed in global setup.
    await profilingHelper.installPolicies();
    await profilingSetup.setupResources();

    viewerApiCreditials = await requestAuth.getApiKey('viewer');
  });

  apiTest.afterAll(async ({ profilingHelper }) => {
    await profilingHelper.cleanupPolicies();
  });

  apiTest('collector integration missing', async ({ profilingHelper, apiServices, apiClient }) => {
    const ids = await profilingHelper.getPolicyIds();
    const collectorId = ids.collectorId;

    expect(collectorId).toBeDefined();

    await apiServices.fleet.package_policies.delete(collectorId!);

    const adminRes = await apiClient.get(esResourcesEndpoint);
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeUndefined();
    expect(adminStatus.has_data).toBeUndefined();
    expect(adminStatus.pre_8_9_1_data).toBeUndefined();

    const readRes = await apiClient.get(esResourcesEndpoint, {
      headers: {
        ...viewerApiCreditials.apiKeyHeader,
        'content-type': 'application/json',
        'kbn-xsrf': 'reporting',
      },
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(false);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });

  apiTest(
    'Symbolizer integration is not installed',
    async ({ profilingHelper, apiClient, apiServices }) => {
      const ids = await profilingHelper.getPolicyIds();
      const symbolizerId = ids.symbolizerId;

      expect(symbolizerId).toBeDefined();

      await apiServices.fleet.package_policies.delete(symbolizerId!);

      const readRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(false);
      expect(readStatus.has_data).toBe(false);
      expect(readStatus.pre_8_9_1_data).toBe(false);
      expect(readStatus.has_required_role).toBe(false);
    }
  );
});
