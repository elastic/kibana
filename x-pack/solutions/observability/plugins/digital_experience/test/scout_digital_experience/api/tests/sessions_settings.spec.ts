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

const { COMMON_HEADERS, SESSIONS_SETTINGS_PATH, createRole } = testData;

const DEFAULTS = { frequency: '1m', concurrency: 2 };

const CONFIGURE_ROLE = createRole({ digital_experience: ['read', 'configure_sessions'] });
const MANAGE_ROLE = createRole({ digital_experience: ['read', 'manage_sessions'] });

apiTest.describe(
  'Digital Experience session summaries settings',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.afterAll(async ({ kbnClient }) => {
      await resetSessionsSettings(kbnClient);
    });

    apiTest(
      'lets a user with the configure sessions privilege read and save them',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(CONFIGURE_ROLE);
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
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(CONFIGURE_ROLE);

      for (const body of [{ frequency: '2h' }, { concurrency: 9 }]) {
        const response = await apiClient.put(SESSIONS_SETTINGS_PATH, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          body,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    });

    apiTest(
      'refuses a user who can set sessions up, but not configure them',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(MANAGE_ROLE);
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
