/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { GlobalSettingsStore } from '../../../scout/api/fixtures';
import {
  GLOBAL_SETTINGS_PATH,
  apiTest,
  createGlobalSettingsStore,
  mergeSloApiHeaders,
} from '../../../scout/api/fixtures';

// The `slo_global_settings_override` server sets `xpack.slo.sliRetention: { enabled: true, periodDays: 200 }`.
const EFFECTIVE_OVERRIDE = { enabled: true, periodDays: 200, source: 'config' };
const SAVED_AT = '2026-11-20T10:00:00.000Z';

apiTest.describe(
  'SLO global settings API with SLI retention set in kibana.yml',
  { tag: tags.stateful.classic },
  () => {
    let headers: Record<string, string>;
    let store: GlobalSettingsStore;

    apiTest.beforeAll(async ({ requestAuth, esClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      store = await createGlobalSettingsStore(esClient);
      await store.deleteStoredGlobalSettings();
    });

    apiTest.afterAll(async () => {
      await store.deleteStoredGlobalSettings();
      await store.cleanup();
    });

    apiTest('GET returns the defaults with the override applied', async ({ apiClient }) => {
      const response = await apiClient.get(GLOBAL_SETTINGS_PATH, { headers, responseType: 'json' });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        sliRetention: {
          enabled: false,
          periodDays: 365,
          updatedAt: null,
          effective: EFFECTIVE_OVERRIDE,
        },
      });
    });

    apiTest('PUT is rejected and saves nothing', async ({ apiClient }) => {
      const putResponse = await apiClient.put(GLOBAL_SETTINGS_PATH, {
        headers,
        body: { sliRetention: { enabled: true, periodDays: 300 } },
        responseType: 'json',
      });

      expect(putResponse).toHaveStatusCode(400);
      expect(putResponse.body.message).toContain('xpack.slo.sliRetention');

      const getResponse = await apiClient.get(GLOBAL_SETTINGS_PATH, {
        headers,
        responseType: 'json',
      });
      expect(getResponse.body.sliRetention.updatedAt).toBeNull();
    });

    apiTest('GET returns the saved value with the override applied', async ({ apiClient }) => {
      // The API cannot save while the override is set, so write the saved object document directly.
      await store.storeSliRetention({ enabled: false, periodDays: 400, updatedAt: SAVED_AT });

      const response = await apiClient.get(GLOBAL_SETTINGS_PATH, {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        sliRetention: {
          enabled: false,
          periodDays: 400,
          updatedAt: SAVED_AT,
          effective: EFFECTIVE_OVERRIDE,
        },
      });
    });
  }
);
