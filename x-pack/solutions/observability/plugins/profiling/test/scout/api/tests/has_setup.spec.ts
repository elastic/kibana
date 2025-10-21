/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, apiTest, test } from '@kbn/scout-oblt';
import type { ScoutTestConfig } from '@kbn/scout-oblt';
import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { getRoutePaths } from '../../../../common';
import { getProfilingPackagePolicyIds, deletePackagePolicy } from '../../common/utils/fleet';
import {
  cleanUpProfilingData,
  loadProfilingData,
  setupProfiling,
} from '../../common/utils/profiling_data';

const profilingRoutePaths = getRoutePaths();

function getSupertest(config: ScoutTestConfig) {
  const kibanaServer = config.metadata.config.servers.kibana;
  const url = formatUrl({
    ...kibanaServer,
    auth: 'elastic:changeme',
  });
  return supertest(url);
}

apiTest.describe('Profiling is not setup and no data is loaded', { tag: ['@svlOblt'] }, () => {
  apiTest.beforeAll(async ({ esClient, log, config }) => {
    await cleanUpProfilingData({
      es: esClient,
      st: getSupertest(config),
      logger: log,
    });
  });

  test('Admin user', async ({ profilingClient }) => {
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });

    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(false);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
    // viewer users
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

test.describe('APM integration not installed but setup completed', { tag: ['@svlOblt'] }, () => {
  test.beforeEach(async ({ esClient, config, log }) => {
    const st = getSupertest(config);
    await setupProfiling(st, log);
  });
  test('Admin user', async ({ profilingClient }) => {
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
});

test.describe('Profiling is setup', { tag: ['@svlOblt'] }, () => {
  test.beforeAll(async ({ esClient, config, log }) => {
    const st = getSupertest(config);
    await cleanUpProfilingData({
      es: esClient,
      st,
      logger: log,
    });
    await setupProfiling(st, log);
  });
  test.afterAll(async ({ esClient, config, log }) => {
    const st = getSupertest(config);
    await cleanUpProfilingData({
      es: esClient,
      st,
      logger: log,
    });
  });
  test('without data', async ({ profilingClient }) => {
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

  test('admin user with data', async ({ esClient, profilingClient, log }) => {
    await loadProfilingData(esClient, log);
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(true);
    expect(adminStatus.pre_8_9_1_data).toBe(false);

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

test.describe('Collector integration is not installed', { tag: ['@svlOblt'] }, () => {
  test.beforeAll(async ({ esClient, config, log }) => {
    const st = getSupertest(config);
    await setupProfiling(st, log);
  });
  test('Collector integration missing', async ({ profilingClient, log, config }) => {
    const st = getSupertest(config);
    const ids = await getProfilingPackagePolicyIds(st);
    const collectorId = ids.collectorId;
    await deletePackagePolicy(st, collectorId);

    expect(collectorId).toBeDefined();

    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(false);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);

    const readRes = await profilingClient.viewerUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(false);
    expect(readStatus.has_data).toBe(false);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });

  test('Symbolizer integration is not installed', async ({ profilingClient, config }) => {
    const st = getSupertest(config);
    const ids = await getProfilingPackagePolicyIds(st);

    const symbolizerId = ids.symbolizerId;
    await deletePackagePolicy(st, symbolizerId);
    expect(symbolizerId).toBeDefined();

    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(false);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);

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
