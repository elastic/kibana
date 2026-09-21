/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  API_KEY_API_PATH,
  COMMON_HEADERS,
  invalidateApiKeyByName,
  invalidateOnboardingApiKeys,
  ONBOARDING_KEY_NAME_PREFIX,
} from '../fixtures';

apiTest.describe('Vector DB onboarding API key API', { tag: [...tags.serverless.vectordb] }, () => {
  // the route only issues a key when the caller has no active one, so every test starts from
  // a project with none
  apiTest.beforeEach(async ({ esClient }) => {
    await invalidateOnboardingApiKeys(esClient);
  });

  apiTest.afterAll(async ({ esClient }) => {
    await invalidateOnboardingApiKeys(esClient);
  });

  apiTest(
    'issues an onboarding key when the caller has none',
    async ({ apiClient, esClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.post(API_KEY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);

      const { id, name, encoded } = response.body;
      expect(typeof id).toBe('string');
      expect(typeof encoded).toBe('string');
      expect(name).toMatch(new RegExp(`^${ONBOARDING_KEY_NAME_PREFIX}\\d+$`));

      const { api_keys: createdKeys } = await esClient.security.getApiKey({ id });
      expect(createdKeys).toHaveLength(1);
      expect(createdKeys[0].invalidated).toBe(false);
      expect(createdKeys[0].name).toBe(name);
    }
  );

  apiTest('does not issue a second key while one is active', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };

    const first = await apiClient.post(API_KEY_API_PATH, {
      headers,
      body: {},
      responseType: 'json',
    });
    expect(typeof first.body.id).toBe('string');

    const second = await apiClient.post(API_KEY_API_PATH, {
      headers,
      body: {},
      responseType: 'json',
    });

    expect(second).toHaveStatusCode(200);
    expect(second.body).toStrictEqual({ id: null, name: null, encoded: null });
  });

  apiTest('names the key as requested', async ({ apiClient, esClient, samlAuth }) => {
    const requestedName = `vectordb-scout-${randomUUID()}`;
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

    try {
      const response = await apiClient.post(API_KEY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { name: requestedName },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe(requestedName);

      const { api_keys: createdKeys } = await esClient.security.getApiKey({
        id: response.body.id,
      });
      expect(createdKeys[0].name).toBe(requestedName);
    } finally {
      // a custom name falls outside the prefix the shared sweep matches
      await invalidateApiKeyByName(esClient, requestedName);
    }
  });

  apiTest('rejects an unauthenticated request', async ({ apiClient }) => {
    const response = await apiClient.post(API_KEY_API_PATH, {
      headers: COMMON_HEADERS,
      body: {},
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(401);
  });
});
