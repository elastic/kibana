/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { resetSessionsSettings } from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { COMMON_HEADERS, SESSIONS_SETTINGS_PATH, createRole } = testData;

const DEFAULTS = { frequency: '1m', concurrency: 2 };

const MANAGE_ROLE = createRole({ digital_experience: ['read', 'manage_sessions'] });
const READ_ROLE = createRole({ digital_experience: ['read'] });

apiTest.describe(
  'Digital Experience session summaries settings',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      // While the flag is still on, as the route needs it.
      await resetSessionsSettings(kbnClient);
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest(
      'lets a user who manages sessions in every space read and save them',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(MANAGE_ROLE);
        const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

        const saved = await apiClient.put(SESSIONS_SETTINGS_PATH, {
          headers,
          body: { frequency: '5m', concurrency: 4 },
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body).toStrictEqual({
          settings: { frequency: '5m', concurrency: 4 },
          defaults: DEFAULTS,
        });

        const read = await apiClient.get(SESSIONS_SETTINGS_PATH, { headers, responseType: 'json' });
        expect(read).toHaveStatusCode(200);
        expect(read.body).toStrictEqual(saved.body);

        // Left out, a setting follows kibana.yml again.
        const reset = await apiClient.put(SESSIONS_SETTINGS_PATH, {
          headers,
          body: { concurrency: 4 },
          responseType: 'json',
        });
        expect(reset).toHaveStatusCode(200);
        expect(reset.body.settings).toStrictEqual({ frequency: '1m', concurrency: 4 });
      }
    );

    apiTest('refuses settings out of bounds', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(MANAGE_ROLE);

      for (const body of [{ frequency: '2h' }, { concurrency: 5 }]) {
        const response = await apiClient.put(SESSIONS_SETTINGS_PATH, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          body,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    });

    apiTest(
      'refuses a user who can only read Digital Experience',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
        const headers = { ...COMMON_HEADERS, ...apiKeyHeader };

        const read = await apiClient.get(SESSIONS_SETTINGS_PATH, { headers, responseType: 'json' });
        expect(read).toHaveStatusCode(403);

        const save = await apiClient.put(SESSIONS_SETTINGS_PATH, {
          headers,
          body: { frequency: '5m' },
          responseType: 'json',
        });
        expect(save).toHaveStatusCode(403);
      }
    );
  }
);
