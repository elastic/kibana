/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import { esArchiversPath, esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe('Profiling is not setup and no data is loaded', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ profilingHelper, profilingSetup }) => {
    await profilingHelper.cleanupPolicies();
    await profilingHelper.installPolicies();
    await profilingSetup.cleanup();
  });

  apiTest('Admin users', async ({ roleBasedApiClient }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: esResourcesEndpoint,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeFalsy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
  });

  apiTest('Viewer users', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: esResourcesEndpoint,
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeFalsy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });
});

apiTest.describe('APM integration not installed but setup completed', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ profilingSetup }) => {
    if (!(await profilingSetup.checkStatus()).has_setup) {
      await profilingSetup.setupResources();
    }
  });
  apiTest('Admin user', async ({ roleBasedApiClient }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: esResourcesEndpoint,
    });

    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
  });

  apiTest('Viewer user', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: esResourcesEndpoint,
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });
});

apiTest.describe('Profiling is setup and data is loaded', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ profilingSetup }) => {
    await profilingSetup.cleanup();
    if (!(await profilingSetup.checkStatus()).has_setup) {
      await profilingSetup.setupResources();
    }
    await profilingSetup.loadData(esArchiversPath);
  });

  apiTest('Admin user', async ({ roleBasedApiClient }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: esResourcesEndpoint,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeTruthy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
  });

  apiTest('Viewer user', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: esResourcesEndpoint,
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeTruthy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });
});

apiTest.describe('Collector integration is not installed', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ profilingSetup }) => {
    await profilingSetup.cleanup();
  });
  apiTest.afterAll(async ({ profilingHelper }) => {
    profilingHelper.cleanupPolicies();
  });

  apiTest(
    'collector integration missing',
    async ({ profilingHelper, roleBasedApiClient, apiServices }) => {
      const ids = await profilingHelper.getPoliciyIds();
      const collectorId = ids.collectorId;

      await apiServices.fleet.package_policies.delete(collectorId!);

      expect(collectorId).toBeDefined();

      const adminRes = await roleBasedApiClient.adminUser({
        endpoint: esResourcesEndpoint,
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBeFalsy();
      expect(adminStatus.has_data).toBeFalsy();
      expect(adminStatus.pre_8_9_1_data).toBeFalsy();

      const readRes = await roleBasedApiClient.viewerUser({
        endpoint: esResourcesEndpoint,
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBeFalsy();
      expect(readStatus.has_data).toBeFalsy();
      expect(readStatus.pre_8_9_1_data).toBeFalsy();
      expect(readStatus.has_required_role).toBeFalsy();
    }
  );

  apiTest(
    'Symbolizer integration is not installed',
    async ({ profilingHelper, roleBasedApiClient, apiServices }) => {
      const ids = await profilingHelper.getPoliciyIds();

      const symbolizerId = ids.symbolizerId;

      await apiServices.fleet.package_policies.delete(symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const adminRes = await roleBasedApiClient.adminUser({
        endpoint: esResourcesEndpoint,
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBeFalsy();
      expect(adminStatus.has_data).toBeFalsy();
      expect(adminStatus.pre_8_9_1_data).toBeFalsy();

      const readRes = await roleBasedApiClient.viewerUser({
        endpoint: esResourcesEndpoint,
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBeFalsy();
      expect(readStatus.has_data).toBeFalsy();
      expect(readStatus.pre_8_9_1_data).toBeFalsy();
      expect(readStatus.has_required_role).toBeFalsy();
    }
  );
});
