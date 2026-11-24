/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { GLOBAL_SETTINGS_PATH, apiTest, mergeSloApiHeaders } from '../../fixtures';

apiTest.describe(
  'SLO global settings API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await apiClient.put(GLOBAL_SETTINGS_PATH, {
        headers,
        body: { sliRetention: { enabled: false, periodDays: 365 } },
        responseType: 'json',
      });
    });

    apiTest('PUT saves the SLI retention and GET returns it', async ({ apiClient }) => {
      const updateResponse = await apiClient.put(GLOBAL_SETTINGS_PATH, {
        headers,
        body: { sliRetention: { enabled: true, periodDays: 200 } },
        responseType: 'json',
      });

      expect(updateResponse).toHaveStatusCode(200);
      const { updatedAt, ...sliRetention } = updateResponse.body.sliRetention;
      expect(sliRetention).toStrictEqual({
        enabled: true,
        periodDays: 200,
        effective: { enabled: true, periodDays: 200, source: 'settings' },
      });
      expect(Number.isNaN(Date.parse(updatedAt))).toBe(false);

      const getResponse = await apiClient.get(GLOBAL_SETTINGS_PATH, {
        headers,
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toStrictEqual(updateResponse.body);
    });

    for (const [name, sliRetention] of [
      ['a period below the minimum', { enabled: true, periodDays: 179 }],
      ['a period above the maximum', { enabled: true, periodDays: 3651 }],
      ['a non-integer period', { enabled: true, periodDays: 200.5 }],
      ['a missing enabled flag', { periodDays: 200 }],
    ] as const) {
      apiTest(`PUT rejects ${name}`, async ({ apiClient }) => {
        const response = await apiClient.put(GLOBAL_SETTINGS_PATH, {
          headers,
          body: { sliRetention },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      });
    }
  }
);
