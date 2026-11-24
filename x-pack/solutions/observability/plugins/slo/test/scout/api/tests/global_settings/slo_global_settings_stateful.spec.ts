/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { GlobalSettingsStore } from '../../fixtures';
import {
  GLOBAL_SETTINGS_PATH,
  apiTest,
  createGlobalSettingsStore,
  mergeSloApiHeaders,
} from '../../fixtures';

apiTest.describe('SLO global settings API (stateful)', { tag: tags.stateful.classic }, () => {
  let store: GlobalSettingsStore;

  apiTest.beforeAll(async ({ esClient }) => {
    store = await createGlobalSettingsStore(esClient);
    await store.deleteStoredGlobalSettings();
  });

  apiTest.afterAll(async () => {
    await store.cleanup();
  });

  apiTest('GET returns the defaults when nothing was saved', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKey('admin');
    const response = await apiClient.get(GLOBAL_SETTINGS_PATH, {
      headers: { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({
      sliRetention: {
        enabled: false,
        periodDays: 365,
        updatedAt: null,
        effective: { enabled: false, periodDays: 365, source: 'default' },
      },
    });
  });
});
