/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, apiTest } from '@kbn/scout-oblt';
import { getRoutePaths } from '../../../../common';
import {
  cleanUpProfilingData,
  loadProfilingData,
  setupProfiling,
  getProfilingPackagePolicyIds,
} from '../../common/utils/profiling_data';

const profilingRoutePaths = getRoutePaths();

apiTest.describe('Profiling is not setup and no data is loaded', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ esClient, apiServices, log, config }) => {
    await cleanUpProfilingData({
      es: esClient,
      apiServices,
      logger: log,
    });
  });

  apiTest('Admin users', async ({ profilingClient, apiClient, apiServices }) => {
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeFalsy();
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer users', async ({ profilingClient, apiServices }) => {
    const readRes = await profilingClient.viewerUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(false);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});

apiTest.describe('APM integration not installed but setup completed', { tag: ['@ess'] }, () => {
  apiTest.beforeEach(async ({ esClient, apiServices, config, log }) => {
    await setupProfiling(config.hosts.kibana, apiServices, log);
  });
  apiTest('Admin user', async ({ profilingClient }) => {
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });

    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user', async ({ profilingClient }) => {
    const readRes = await profilingClient.viewerUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});

apiTest.describe('Profiling is setup', { tag: ['@svlOblt'] }, () => {
  apiTest.beforeAll(async ({ esClient, apiServices, config, log }) => {
    await cleanUpProfilingData({
      es: esClient,
      apiServices,
      logger: log,
    });
    await setupProfiling(config.hosts.kibana, apiServices, log);
  });
  apiTest.afterAll(async ({ esClient, apiServices, log }) => {
    await cleanUpProfilingData({
      es: esClient,
      apiServices,
      logger: log,
    });
  });
  apiTest('without data', async ({ profilingClient }) => {
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);

    const readRes = await profilingClient.viewerUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });

  apiTest('Admin user with data', async ({ esClient, profilingClient, log }) => {
    await loadProfilingData(esClient, log);
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(true);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user with data', async ({ profilingClient }) => {
    const readRes = await profilingClient.viewerUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(true);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});

apiTest.describe('Collector integration is not installed', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ esClient, apiServices, config, log }) => {
    await setupProfiling(config.hosts.kibana, apiServices, log);
  });

  apiTest('Admin user collector integration missing', async ({ profilingClient, apiServices }) => {
    const ids = await getProfilingPackagePolicyIds(apiServices);
    const collectorId = ids.collectorId;
    await apiServices.fleet.agent_policies.delete(collectorId!);

    expect(collectorId).toBeDefined();

    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(false);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user collector integration missing', async ({ profilingClient, apiServices }) => {
    const ids = await getProfilingPackagePolicyIds(apiServices);
    const collectorId = ids.collectorId;
    await apiServices.fleet.agent_policies.delete(collectorId!);

    expect(collectorId).toBeDefined();

    const readRes = await profilingClient.viewerUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(false);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });

  apiTest(
    'Admin user symbolizer integration is not installed',
    async ({ profilingClient, apiServices }) => {
      const ids = await getProfilingPackagePolicyIds(apiServices);

      const symbolizerId = ids.symbolizerId;

      await apiServices.fleet.agent_policies.delete(symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const adminRes = await profilingClient.adminUser({
        endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBe(false);
      expect(adminStatus.has_data).toBe(false);
      expect(adminStatus.pre_8_9_1_data).toBe(false);
    }
  );

  apiTest(
    'Viewer user symbolizer integration is not installed',
    async ({ profilingClient, apiServices }) => {
      const ids = await getProfilingPackagePolicyIds(apiServices);
      const symbolizerId = ids.symbolizerId;
      await apiServices.fleet.agent_policies.delete(symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const readRes = await profilingClient.viewerUser({
        endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(false);
      expect(readStatus.has_data).toBe(false);
      expect(readStatus.pre_8_9_1_data).toBe(false);
      expect(readStatus.has_required_role).toBe(false);
    }
  );
});
