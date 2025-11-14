/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, apiTest } from '@kbn/scout-oblt';
import {
  cleanUpProfilingData,
  loadProfilingData,
  setupProfiling,
  getProfilingPackagePolicyIds,
  deletePackagePolicy,
} from '../../common/utils/profiling_data';

apiTest.describe('Profiling is not setup and no data is loaded', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ esClient, log, config }) => {
    await cleanUpProfilingData({
      es: esClient,
      config,
      logger: log,
    });
  });

  apiTest('Admin users', async ({ roleBasedApiClient }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeFalsy();
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer users', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(false);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});

apiTest.describe('APM integration not installed but setup completed', { tag: ['@ess'] }, () => {
  apiTest.beforeEach(async ({ apiServices, config, log }) => {
    await setupProfiling(config, apiServices, log);
  });
  apiTest('Admin user', async ({ roleBasedApiClient }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });

    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});

apiTest.describe('Profiling is setup', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ esClient, apiServices, config, log }) => {
    await cleanUpProfilingData({
      es: esClient,
      config,
      logger: log,
    });
    await setupProfiling(config, apiServices, log);
  });
  apiTest.afterAll(async ({ esClient, config, log }) => {
    await cleanUpProfilingData({
      es: esClient,
      config,
      logger: log,
    });
  });
  apiTest('without data', async ({ roleBasedApiClient }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);

    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });

  apiTest('Admin user with data', async ({ esClient, roleBasedApiClient, log }) => {
    await loadProfilingData(esClient, log);
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(true);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user with data', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(true);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});

apiTest.describe('Collector integration is not installed', { tag: ['@ess'] }, () => {
  apiTest.beforeEach(async ({ apiServices, config, log }) => {
    await setupProfiling(config, apiServices, log);
  });

  apiTest('Admin user collector integration missing', async ({ roleBasedApiClient, config }) => {
    const ids = await getProfilingPackagePolicyIds(config);
    const collectorId = ids.collectorId;
    await deletePackagePolicy(config, collectorId!);

    expect(collectorId).toBeDefined();

    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(false);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user collector integration missing', async ({ roleBasedApiClient, config }) => {
    const ids = await getProfilingPackagePolicyIds(config);
    const collectorId = ids.collectorId;
    await deletePackagePolicy(config, collectorId!);

    expect(collectorId).toBeDefined();

    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(false);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });

  apiTest(
    'Admin user symbolizer integration is not installed',
    async ({ roleBasedApiClient, config }) => {
      const ids = await getProfilingPackagePolicyIds(config);

      const symbolizerId = ids.symbolizerId;

      await deletePackagePolicy(config, symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const adminRes = await roleBasedApiClient.adminUser({
        endpoint: 'GET /api/profiling/setup/es_resources',
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBe(false);
      expect(adminStatus.has_data).toBe(false);
      expect(adminStatus.pre_8_9_1_data).toBe(false);
    }
  );

  apiTest(
    'Viewer user symbolizer integration is not installed',
    async ({ roleBasedApiClient, config }) => {
      const ids = await getProfilingPackagePolicyIds(config);
      const symbolizerId = ids.symbolizerId;
      await deletePackagePolicy(config, symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const readRes = await roleBasedApiClient.viewerUser({
        endpoint: 'GET /api/profiling/setup/es_resources',
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(false);
      expect(readStatus.has_data).toBe(false);
      expect(readStatus.pre_8_9_1_data).toBe(false);
      expect(readStatus.has_required_role).toBe(false);
    }
  );
});
