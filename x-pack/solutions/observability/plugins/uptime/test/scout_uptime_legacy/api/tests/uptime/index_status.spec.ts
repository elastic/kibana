/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../../fixtures';

apiTest.describe('indexStatus query', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
    adminCredentials = await requestAuth.getApiKey('admin');
    await esArchiver.load(testData.ES_ARCHIVES.FULL_HEARTBEAT);
  });

  apiTest.afterAll(async ({ esArchiver }) => {
    await esArchiver.unload(testData.ES_ARCHIVES.FULL_HEARTBEAT);
  });

  apiTest(`will fetch the index's count`, async ({ apiClient }) => {
    const response = await apiClient.get(testData.API_URLS.INDEX_STATUS.slice(1), {
      headers: { ...adminCredentials.apiKeyHeader, ...testData.COMMON_HEADERS },
      responseType: 'json',
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toStrictEqual({
      indexExists: true,
      indices: 'heartbeat-*',
    });
  });
});
