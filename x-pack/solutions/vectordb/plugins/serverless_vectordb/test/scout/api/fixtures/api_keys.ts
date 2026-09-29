/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SecurityApiKey } from '@elastic/elasticsearch/lib/api/types';
import type { ApiClientFixture } from '@kbn/scout';
import { COMMON_HEADERS, ONBOARDING_KEY_NAME_PREFIX } from './constants';

/** Resolves the username behind a session cookie, which is the owner of any key it creates. */
export const getSessionUsername = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>
): Promise<string> => {
  const response = await apiClient.get('internal/security/me', {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

  return response.body.username;
};

const invalidateActiveKeys = async (esClient: Client, apiKeys: SecurityApiKey[]) => {
  const activeIds = apiKeys.filter(({ invalidated }) => !invalidated).map(({ id }) => id);

  if (activeIds.length > 0) {
    await esClient.security.invalidateApiKey({ ids: activeIds });
  }
};

/**
 * Invalidates the onboarding keys owned by the given users. The route only issues a key when the
 * caller has none, so suites have to establish that starting point themselves rather than inherit
 * whatever an earlier run (or the UI suites) left behind.
 */
export const invalidateOnboardingApiKeys = async (esClient: Client, usernames: string[]) => {
  for (const username of usernames) {
    // Elasticsearch rejects a lookup that filters on both username and key name
    const { api_keys: apiKeys } = await esClient.security.getApiKey({ username });
    await invalidateActiveKeys(
      esClient,
      apiKeys.filter(({ name }) => name?.startsWith(ONBOARDING_KEY_NAME_PREFIX))
    );
  }
};

/** Invalidates keys created under a test-specific name, which the prefix sweep would miss. */
export const invalidateApiKeyByName = async (esClient: Client, name: string) => {
  const { api_keys: apiKeys } = await esClient.security.getApiKey({ name });
  await invalidateActiveKeys(esClient, apiKeys);
};
