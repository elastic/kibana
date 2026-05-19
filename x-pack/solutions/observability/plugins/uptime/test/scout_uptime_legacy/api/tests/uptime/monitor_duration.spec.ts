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

apiTest.describe('monitor duration query', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    await esArchiver.load(testData.ES_ARCHIVES.FULL_HEARTBEAT);
  });

  apiTest.afterAll(async ({ esArchiver }) => {
    await esArchiver.unload(testData.ES_ARCHIVES.FULL_HEARTBEAT);
  });

  apiTest(
    'will fetch a series of data points for monitor duration and status',
    async ({ apiClient }) => {
      const response = await apiClient.get(testData.API_URLS.MONITOR_DURATION.slice(1), {
        headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
        query: {
          monitorId: '0002-up',
          dateStart: '2019-09-11T03:31:04.380Z',
          dateEnd: '2019-09-11T03:40:34.410Z',
        },
        responseType: 'json',
      });
      expect(response.statusCode).toBe(200);
      expectFixtureEql(response.body, 'monitor_charts');
    }
  );

  apiTest('will fetch empty sets for a date range with no data', async ({ apiClient }) => {
    const response = await apiClient.get(testData.API_URLS.MONITOR_DURATION.slice(1), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      query: {
        monitorId: '0002-up',
        dateStart: '1999-09-11T03:31:04.380Z',
        dateEnd: '1999-09-11T03:40:34.410Z',
      },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({
      locationDurationLines: [],
    });
  });
});
