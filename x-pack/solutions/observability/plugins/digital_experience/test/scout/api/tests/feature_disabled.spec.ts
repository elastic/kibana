/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { DIGITAL_EXPERIENCE_DISABLED_TAGS } from '../../tags';

apiTest.describe(
  'Digital Experience disabled by default',
  { tag: DIGITAL_EXPERIENCE_DISABLED_TAGS },
  () => {
    apiTest('answers 404 from its routes', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const response = await apiClient.get(
        'internal/digital_experience/applications?start=2026-01-01T00:00:00.000Z&end=2026-01-02T00:00:00.000Z',
        {
          headers: {
            ...apiKeyHeader,
            'kbn-xsrf': 'some-xsrf-token',
            'x-elastic-internal-origin': 'kibana',
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(404);
    });
  }
);
