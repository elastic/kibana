/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DEPLOYMENT_STATS_API_PATH } from '../fixtures';

/**
 * Every field the route returns. Each holds a value of the listed type, or `null` when the caller
 * lacks the privileges to compute it or the lookup fails. The test fails if the response gains or
 * loses a field, so new fields have to be added here.
 */
const EXPECTED_TYPES: Record<string, 'number' | 'object'> = {
  indicesCount: 'number',
  documentsCount: 'number',
  vectorCount: 'number',
  storeSizeBytes: 'number',
  dashboardsCount: 'number',
  apiKeysCount: 'number',
  expiringApiKeysCount: 'number',
  newIndex: 'object',
};

apiTest.describe('Vector DB deployment stats API', { tag: [...tags.serverless.vectordb] }, () => {
  apiTest('returns a value for every home page stat', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    const response = await apiClient.get(DEPLOYMENT_STATS_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);

    const body = response.body as Record<string, unknown>;

    expect(Object.keys(body).sort()).toStrictEqual(Object.keys(EXPECTED_TYPES).sort());

    const unexpectedTypes = Object.entries(EXPECTED_TYPES)
      .filter(([field, type]) => body[field] !== null && typeof body[field] !== type)
      .map(([field]) => `${field}: ${typeof body[field]}`);

    expect(unexpectedTypes).toStrictEqual([]);
  });

  apiTest('rejects an unauthenticated request', async ({ apiClient }) => {
    const response = await apiClient.get(DEPLOYMENT_STATS_API_PATH, {
      headers: COMMON_HEADERS,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(401);
  });
});
