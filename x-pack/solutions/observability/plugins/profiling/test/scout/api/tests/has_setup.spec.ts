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
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
  });

  apiTest('Viewer users', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeFalsy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
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
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
  });

  apiTest('Viewer user', async ({ roleBasedApiClient }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
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
  apiTest('without data', async ({ roleBasedApiClient, log }) => {
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    log.info('Admin user response: %o', adminRes.body);
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();

    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    log.info('read user response: %o', readRes.body);
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });

  apiTest('Admin user with data', async ({ esClient, roleBasedApiClient, log }) => {
    await loadProfilingData(esClient, log);
    const adminRes = await roleBasedApiClient.adminUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });
    log.info('Admin user response: %o', adminRes.body);
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeTruthy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
  });

  apiTest('Viewer user with data', async ({ roleBasedApiClient, log }) => {
    const readRes = await roleBasedApiClient.viewerUser({
      endpoint: 'GET /api/profiling/setup/es_resources',
    });

    log.info('Read user response: %o', readRes.body);

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeTruthy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
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
    expect(adminStatus.has_setup).toBeFalsy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
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
    expect(readStatus.has_setup).toBeFalsy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
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
      expect(adminStatus.has_setup).toBeFalsy();
      expect(adminStatus.has_data).toBeFalsy();
      expect(adminStatus.pre_8_9_1_data).toBeFalsy();
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
      expect(readStatus.has_setup).toBeFalsy();
      expect(readStatus.has_data).toBeFalsy();
      expect(readStatus.pre_8_9_1_data).toBeFalsy();
      expect(readStatus.has_required_role).toBeFalsy();
    }
  );
});
