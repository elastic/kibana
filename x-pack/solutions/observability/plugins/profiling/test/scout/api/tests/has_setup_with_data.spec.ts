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
import { esArchiversPath, esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe('Profiling is setup and data is loaded', { tag: tags.stateful.classic }, () => {
  let viewerApiCreditials: RoleApiCredentials;
  let adminApiCreditials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, profilingHelper, profilingSetup }) => {
    await profilingHelper.installPolicies();
    await profilingSetup.setupResources();
    await profilingSetup.loadData(esArchiversPath);

    await expect
      .poll(
        async () => {
          const status = await profilingSetup.checkStatus();
          return status.has_setup === true && status.has_data === true;
        },
        {
          timeout: 30_000,
          intervals: [500, 1000, 2000, 4000],
          message:
            'Profiling status did not converge to has_setup: true, has_data: true after setupResources + loadData',
        }
      )
      .toBe(true);

    viewerApiCreditials = await requestAuth.getApiKey('viewer');
    adminApiCreditials = await requestAuth.getApiKey('admin');
  });

  apiTest('Admin user', async ({ apiClient }) => {
    const adminRes = await apiClient.get(esResourcesEndpoint, {
      headers: {
        ...adminApiCreditials.apiKeyHeader,
        'content-type': 'application/json',
        'kbn-xsrf': 'reporting',
      },
    });
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBe(true);
    expect(adminStatus.has_data).toBe(true);
    expect(adminStatus.pre_8_9_1_data).toBe(false);
  });

  apiTest('Viewer user', async ({ apiClient }) => {
    const readRes = await apiClient.get(esResourcesEndpoint, {
      headers: {
        ...viewerApiCreditials.apiKeyHeader,
        'content-type': 'application/json',
        'kbn-xsrf': 'reporting',
      },
    });

    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBe(true);
    expect(readStatus.has_data).toBe(true);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});
