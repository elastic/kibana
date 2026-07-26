/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';
import { API_KEY_API_PATH, COMMON_HEADERS, ONBOARDING_KEY_NAME_PREFIX } from '../constants';

const invalidateOnboardingKeys = async (esClient: Client) => {
  const { api_keys: apiKeys } = await esClient.security.getApiKey({
    name: `${ONBOARDING_KEY_NAME_PREFIX}*`,
  });
  const ids = apiKeys.filter((key) => !key.invalidated).map((key) => key.id);
  if (ids.length > 0) {
    await esClient.security.invalidateApiKey({ ids });
  }
};

apiTest.describe('Vector DB onboarding API key API', { tag: [...tags.serverless.vectordb] }, () => {
  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
  });

  // The route treats any active `vectordb-onboarding-*` key as "already onboarded",
  // so each test needs a clean slate; also clean up after the suite.
  apiTest.beforeEach(async ({ esClient }) => {
    await invalidateOnboardingKeys(esClient);
  });

  apiTest.afterAll(async ({ esClient }) => {
    await invalidateOnboardingKeys(esClient);
  });

  apiTest('POST creates an onboarding API key when none is active', async ({ apiClient }) => {
    const response = await apiClient.post(API_KEY_API_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: JSON.stringify({}),
    });

    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.id).toBe('string');
    expect(response.body.name).toMatch(new RegExp(`^${ONBOARDING_KEY_NAME_PREFIX}`));
    expect(typeof response.body.encoded).toBe('string');
  });

  apiTest(
    'POST returns nulls when an active onboarding key already exists',
    async ({ apiClient }) => {
      const first = await apiClient.post(API_KEY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({}),
      });
      expect(first).toHaveStatusCode(200);
      expect(typeof first.body.id).toBe('string');

      const second = await apiClient.post(API_KEY_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: JSON.stringify({}),
      });
      expect(second).toHaveStatusCode(200);
      expect(second.body).toStrictEqual({ id: null, name: null, encoded: null });
    }
  );
});
