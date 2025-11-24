/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, apiTest } from '@kbn/scout-oblt';
import {
  cleanUpProfiling,
  loadProfilingData,
  setupProfiling,
  getProfilingPackagePolicyIds,
} from '../../common/utils/profiling_data';

const esResourcesEndpoint = 'GET /api/profiling/setup/es_resources';

apiTest.describe('Profiling is not setup and no data is loaded', { tag: ['@ess'] }, () => {
  apiTest.beforeAll(async ({ esClient, log, apiServices }) => {
    await cleanUpProfiling({
      es: esClient,
      apiServices,
      logger: log,
    });
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
  apiTest.beforeAll(async ({ apiServices, kbnClient, log }) => {
    await setupProfiling(apiServices, kbnClient, log);
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
  apiTest.beforeAll(async ({ esClient, kbnClient, apiServices, log }) => {
    await cleanUpProfiling({
      es: esClient,
      apiServices,
      logger: log,
    });

    await setupProfiling(apiServices, kbnClient, log);
    await loadProfilingData(esClient, log);
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
  apiTest.beforeAll(async ({ esClient }) => {
    const indices = await esClient.cat.indices({ format: 'json' });

    const profilingIndices = indices
      .filter((index) => index.index !== undefined)
      .map((index) => index.index)
      .filter((index) => {
        return index!.startsWith('profiling') || index!.startsWith('.profiling');
      }) as string[];

    await Promise.all([
      ...profilingIndices.map((index) => esClient.indices.delete({ index })),
      esClient.indices.deleteDataStream({
        name: 'profiling-events*',
      }),
    ]);
  });

  apiTest('collector integration missing', async ({ roleBasedApiClient, apiServices }) => {
    const ids = await getProfilingPackagePolicyIds(apiServices);
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
  });

  apiTest(
    'Symbolizer integration is not installed',
    async ({ roleBasedApiClient, apiServices }) => {
      const ids = await getProfilingPackagePolicyIds(apiServices);

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
