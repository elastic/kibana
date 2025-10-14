/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout-oblt';

import Path from 'path';
import fs from 'fs';
import { getRoutePaths } from '../../../../common';
// These helpers are reused from the api_integration tests. Paths are relative to this file.
// import {
//   cleanUpProfilingData,
//   loadProfilingData,
//   setupProfiling,
// } from '../../../api_integration/profiling/tests/utils/profiling_data';
// import {
//   deletePackagePolicy,
//   getProfilingPackagePolicyIds,
// } from '../../../api_integration/profiling/tests/utils/fleet';

const profilingRoutePaths = getRoutePaths();

const esArchiversPath = Path.posix.join(
  __dirname,
  '..',
  '..',
  'common',
  'fixtures',
  'es_archiver',
  'profiling'
);

test.describe('Profiling status check (scout)', { tag: ['@svlOblt'] }, () => {
  test.beforeAll(async ({ esClient }) => {
    const indices = await esClient.cat.indices({ format: 'json' });
    const content = fs.readFileSync(`${esArchiversPath}/data.json`, 'utf8');
    await esClient.bulk({ operations: content.split('\n'), refresh: 'wait_for' });
  });
  // fixtures provided by scout environment:
  // - profilingApiClient: { adminUser(), readUser() }
  // - es, logger
  // - bettertest may be created from supertest; here we create a small adapter when needed via profilingApiClient
  test('Profiling lifecycle checks', async ({ profilingClient, log }) => {
    // 1) Not set up and no data
    // await cleanUpProfilingData({ es, logger, bettertest: profilingApiClient /* adapter used by helpers */ });
    // Admin
    const adminRes = await profilingClient.adminUser({
      endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    });

    // const adminRes = await profilingApiClient.adminUser({
    //   endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    // });

    const adminStatus = adminRes.body;

    expect(adminStatus.has_setup).toBe(false);
    expect(adminStatus.has_data).toBe(false);
    expect(adminStatus.pre_8_9_1_data).toBe(false);

    // // Viewer / read user
    // const readRes = await apiClient.get(`${profilingRoutePaths.HasSetupESResources}`);
    // // = await profilingApiClient.readUser({
    // //   endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
    // // });
    // const readStatus: ProfilingStatus = readRes.body;
    // expect(readStatus.has_setup).toBe(false);
    // expect(readStatus.has_data).toBe(false);
    // expect(readStatus.pre_8_9_1_data).toBe(false);
    // expect(readStatus.has_required_role).toBe(false);
  });

  // 2) APM integration not installed but setup run
  // await test.step('APM integration not installed but setup completed', async () => {
  //   await setupProfiling(profilingApiClient /* bettertest */, logger);

  //   const adminRes = await profilingApiClient.adminUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const adminStatus: ProfilingStatus = adminRes.body;
  //   expect(adminStatus.has_setup).toBe(true);
  //   expect(adminStatus.has_data).toBe(false);
  //   expect(adminStatus.pre_8_9_1_data).toBe(false);

  //   const readRes = await profilingApiClient.readUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const readStatus: ProfilingStatus = readRes.body;
  //   expect(readStatus.has_setup).toBe(true);
  //   expect(readStatus.has_data).toBe(false);
  //   expect(readStatus.pre_8_9_1_data).toBe(false);
  //   expect(readStatus.has_required_role).toBe(false);
  // });

  // 3) Profiling set up, without data
  // await test.step('Profiling set up without data', async () => {
  //   await cleanUpProfilingData({ es, logger, bettertest: profilingApiClient });
  //   await setupProfiling(profilingApiClient /* bettertest */, logger);

  //   const adminRes = await profilingApiClient.adminUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const adminStatus: ProfilingStatus = adminRes.body;
  //   expect(adminStatus.has_setup).toBe(true);
  //   expect(adminStatus.has_data).toBe(false);
  //   expect(adminStatus.pre_8_9_1_data).toBe(false);

  //   const readRes = await profilingApiClient.readUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const readStatus: ProfilingStatus = readRes.body;
  //   expect(readStatus.has_setup).toBe(true);
  //   expect(readStatus.has_data).toBe(false);
  //   expect(readStatus.pre_8_9_1_data).toBe(false);
  //   expect(readStatus.has_required_role).toBe(false);
  // });

  // 4) Profiling set up with data
  // await test.step('Profiling set up with data', async () => {
  //   await loadProfilingData(es, logger);

  //   const adminRes = await profilingApiClient.adminUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const adminStatus: ProfilingStatus = adminRes.body;
  //   expect(adminStatus.has_setup).toBe(true);
  //   expect(adminStatus.has_data).toBe(true);
  //   expect(adminStatus.pre_8_9_1_data).toBe(false);

  //   const readRes = await profilingApiClient.readUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const readStatus: ProfilingStatus = readRes.body;
  //   expect(readStatus.has_setup).toBe(true);
  //   expect(readStatus.has_data).toBe(true);
  //   expect(readStatus.pre_8_9_1_data).toBe(false);
  //   expect(readStatus.has_required_role).toBe(false);
  // });

  // 5) Collector integration missing
  // await test.step('Collector integration missing', async () => {
  //   await setupProfiling(profilingApiClient /* bettertest */, logger);
  //   const ids = await getProfilingPackagePolicyIds(profilingApiClient /* bettertest */);
  //   const collectorId = ids.collectorId;
  //   if (collectorId) {
  //     await deletePackagePolicy(profilingApiClient /* bettertest */, collectorId);
  //   }

  //   expect(collectorId).not.toBe(undefined);

  //   const adminRes = await profilingApiClient.adminUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const adminStatus: ProfilingStatus = adminRes.body;
  //   expect(adminStatus.has_setup).toBe(false);
  //   expect(adminStatus.has_data).toBe(false);
  //   expect(adminStatus.pre_8_9_1_data).toBe(false);
  // });

  // 6) Symbolizer integration missing
  // await test.step('Symbolizer integration missing', async () => {
  //   await setupProfiling(profilingApiClient /* bettertest */, logger);
  //   const ids = await getProfilingPackagePolicyIds(profilingApiClient /* bettertest */);
  //   const symbolizerId = ids.symbolizerId;
  //   if (symbolizerId) {
  //     await deletePackagePolicy(profilingApiClient /* bettertest */, symbolizerId);
  //   }

  //   expect(symbolizerId).not.toBe(undefined);

  //   const adminRes = await profilingApiClient.adminUser({
  //     endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
  //   });
  //   const adminStatus: ProfilingStatus = adminRes.body;
  //   expect(adminStatus.has_setup).toBe(false);
  //   expect(adminStatus.has_data).toBe(false);
  //   expect(adminStatus.pre_8_9_1_data).toBe(false);
  // });
});
