/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import { esArchiversPath, esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe('Collector integration is not installed', { tag: tags.stateful.classic }, () => {
  let viewerApiCreditials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, profilingSetup, profilingHelper }) => {
    let ids = await profilingHelper.getPolicyIds();
    if (!ids.collectorId || !ids.symbolizerId) {
      await profilingHelper.installPolicies();
      await profilingSetup.setupResources();
      ids = await profilingHelper.getPolicyIds();
    }

    expect(ids.collectorId).toBeDefined();
    expect(ids.symbolizerId).toBeDefined();

    // Same fixture as has_setup_with_data: ensure profiling* has documents so we assert has_data like has_setup — indexed data remains after Fleet policy deletion.
    let status = await profilingSetup.checkStatus();
    if (!status.has_data) {
      await profilingSetup.loadData(esArchiversPath);
      status = await profilingSetup.checkStatus();
    }
    expect(status.has_data).toBe(true);

    viewerApiCreditials = await requestAuth.getApiKey('viewer');
  });

  apiTest('collector integration missing', async ({ profilingHelper, apiServices, apiClient }) => {
    const ids = await profilingHelper.getPolicyIds();
    const collectorId = ids.collectorId;

    await apiServices.fleet.package_policies.delete(collectorId!);

    expect(collectorId).toBeDefined();

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
    expect(readStatus.has_data).toBe(true);
    expect(readStatus.pre_8_9_1_data).toBeDefined();
    expect(readStatus.has_required_role).toBe(false);
  });

  apiTest(
    'Symbolizer integration is not installed',
    async ({ profilingHelper, apiClient, apiServices }) => {
      const ids = await profilingHelper.getPolicyIds();

      const symbolizerId = ids.symbolizerId;

      await apiServices.fleet.package_policies.delete(symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const adminRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBe(false);
      expect(adminStatus.has_data).toBe(true);
      expect(adminStatus.pre_8_9_1_data).toBeDefined();

      const readRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
        },
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(false);
      expect(readStatus.has_data).toBe(true);
      expect(readStatus.pre_8_9_1_data).toBeDefined();
      expect(readStatus.has_required_role).toBe(false);
    }
  );
});
