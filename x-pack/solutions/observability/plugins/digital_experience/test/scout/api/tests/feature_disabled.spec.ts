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
    apiTest('does not register the feature', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const response = await apiClient.get('api/features', {
        headers: { ...apiKeyHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const featureIds = (response.body as Array<{ id: string }>).map(({ id }) => id);
      expect(featureIds).not.toContain('digital_experience');
    });
  }
);
