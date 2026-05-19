/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../../fixtures';
import { expectFixtureEql } from '../../fixtures/helpers/expect_fixture_eql';

apiTest.describe('get monitor latest status API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    await esArchiver.load(testData.ES_ARCHIVES.FULL_HEARTBEAT);
  });

  apiTest.afterAll(async ({ esArchiver }) => {
    await esArchiver.unload(testData.ES_ARCHIVES.FULL_HEARTBEAT);
  });

  apiTest('returns the status for only the given monitor', async ({ apiClient }) => {
    const response = await apiClient.get(testData.API_URLS.MONITOR_STATUS.slice(1), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      query: {
        monitorId: '0002-up',
        dateStart: '2018-01-28T17:40:08.078Z',
        dateEnd: '2025-01-28T19:00:16.078Z',
      },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    expectFixtureEql(response.body, 'monitor_latest_status');
  });
});
