/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { COMMON_HEADERS, DEPLOYMENT_STATS_API_PATH } from '../constants';

apiTest.describe('Vector DB deployment stats API', { tag: [...tags.serverless.vectordb] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
  });

  apiTest('GET returns deployment stats with the expected shape', async ({ apiClient }) => {
    const response = await apiClient.get(DEPLOYMENT_STATS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
    });

    expect(response).toHaveStatusCode(200);

    const { body } = response;
    expect(Object.keys(body).sort()).toStrictEqual([
      'dashboardsCount',
      'indicesCount',
      'storeSizeBytes',
      'vectorDocsCount',
    ]);
    // Counts are numbers, or null when the underlying fetch could not resolve them
    for (const key of Object.keys(body)) {
      const value = body[key];
      expect(value === null || typeof value === 'number').toBe(true);
    }
  });
});
