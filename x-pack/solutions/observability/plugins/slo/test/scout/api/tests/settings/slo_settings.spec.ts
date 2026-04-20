/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { DEFAULT_SETTINGS } from '../../../../../server/services/slo_settings_repository';
import { apiTest, mergeSloApiHeaders } from '../../fixtures';

apiTest.describe(
  'SLO settings API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'GET /internal/slo/settings returns default settings',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKey('admin');
        const headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
        const settingsRes = await apiClient.get('internal/slo/settings', {
          headers,
          responseType: 'json',
        });
        expect(settingsRes).toHaveStatusCode(200);
        expect(settingsRes.body).toStrictEqual(DEFAULT_SETTINGS);
      }
    );
  }
);
