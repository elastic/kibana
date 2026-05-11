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
import { esArchiversPath, esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe('Collector integration is not installed', { tag: tags.stateful.classic }, () => {
  // Profiling POST /setup can wait on ES plugin resources after Fleet policy creation — allow a longer hook budget than the default project timeout (60s).
  // eslint-disable-next-line @kbn/eslint/scout_no_describe_configure -- extended timeout applies to hooks (beforeAll); see https://playwright.dev/docs/test-timeouts
  apiTest.describe.configure({ timeout: 180_000 });

  let viewerApiCreditials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, profilingSetup, profilingHelper }) => {
    await profilingHelper.installPolicies();

    let ids = await profilingHelper.getPolicyIds();
    if (!ids.collectorId || !ids.symbolizerId) {
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

  apiTest.afterAll(async ({ profilingHelper }) => {
    await profilingHelper.cleanupPolicies();
  });

  // Fleet package_policies.delete is eventually consistent — a subsequent /api/profiling/setup/es_resources call may still see the policy as installed for a brief window. Polling until `has_setup` reflects the deletion (cloud: false; self-managed: unchanged true) keeps the test deterministic.
  const getViewerStatus = async (apiClient: ApiClientFixture) => {
    const res = await apiClient.get(esResourcesEndpoint, {
      headers: {
        ...viewerApiCreditials.apiKeyHeader,
        'content-type': 'application/json',
        'kbn-xsrf': 'reporting',
      },
    });
    return res.body;
  };

  const waitForExpectedHasSetup = async (apiClient: ApiClientFixture) => {
    // In cloud, has_setup requires collector + symbolizer Fleet policies — deleting either flips it to false. In self-managed/serverless, has_setup is ES-only and unaffected by Fleet policy deletion.
    await expect
      .poll(
        async () => {
          const status = await getViewerStatus(apiClient);
          return status.has_setup === (status.type !== 'cloud');
        },
        {
          timeout: 30_000,
          intervals: [500, 1000, 2000, 4000],
          message:
            'has_setup did not converge to expected value after Fleet package policy deletion',
        }
      )
      .toBe(true);
  };

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

    await waitForExpectedHasSetup(apiClient);

    const readStatus = await getViewerStatus(apiClient);
    expect(readStatus.has_setup).toBe(readStatus.type !== 'cloud');
    expect(readStatus.has_data).toBe(true);
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

      await waitForExpectedHasSetup(apiClient);

      const readStatus = await getViewerStatus(apiClient);
      expect(readStatus.has_setup).toBe(readStatus.type !== 'cloud');
      expect(readStatus.has_data).toBe(true);
      expect(readStatus.pre_8_9_1_data).toBe(false);
      expect(readStatus.has_required_role).toBe(false);
    }
  );
});
