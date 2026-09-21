/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ONBOARDING_KEY_NAME_PREFIX } from './constants';

/**
 * Invalidates every API key the onboarding route would consider active. The route only issues a
 * key when none exists, so suites have to establish that starting point themselves rather than
 * inherit whatever an earlier run (or the UI suites) left behind.
 */
export const invalidateOnboardingApiKeys = async (esClient: Client) => {
  const { api_keys: apiKeys } = await esClient.security.getApiKey({
    name: `${ONBOARDING_KEY_NAME_PREFIX}*`,
  });

  const activeIds = apiKeys.filter(({ invalidated }) => !invalidated).map(({ id }) => id);

  if (activeIds.length > 0) {
    await esClient.security.invalidateApiKey({ ids: activeIds });
  }
};

/** Invalidates keys created under a test-specific name, which the prefix sweep would miss. */
export const invalidateApiKeyByName = async (esClient: Client, name: string) => {
  const { api_keys: apiKeys } = await esClient.security.getApiKey({ name });

  const activeIds = apiKeys.filter(({ invalidated }) => !invalidated).map(({ id }) => id);

  if (activeIds.length > 0) {
    await esClient.security.invalidateApiKey({ ids: activeIds });
  }
};
