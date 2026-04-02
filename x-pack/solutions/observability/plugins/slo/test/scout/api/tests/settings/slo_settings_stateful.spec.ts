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

apiTest.describe('SLO settings API (stateful)', { tag: [...tags.stateful.classic] }, () => {
  apiTest('PUT updates settings', async ({ apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKey('admin');
    const headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

    const payload = {
      useAllRemoteClusters: true,
      selectedRemoteClusters: ['cluster-1', 'cluster-2'],
      staleThresholdInHours: 12,
      staleInstancesCleanupEnabled: true,
    };
    try {
      const updatedSettingsRes = await apiClient.put('internal/slo/settings', {
        headers,
        body: payload,
        responseType: 'json',
      });
      expect(updatedSettingsRes).toHaveStatusCode(200);
      expect(updatedSettingsRes.body).toStrictEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-1', 'cluster-2'],
        staleThresholdInHours: 12,
        staleInstancesCleanupEnabled: true,
      });

      const retrievedRes = await apiClient.get('internal/slo/settings', {
        headers,
        responseType: 'json',
      });
      expect(retrievedRes).toHaveStatusCode(200);
      expect(retrievedRes.body).toStrictEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-1', 'cluster-2'],
        staleThresholdInHours: 12,
        staleInstancesCleanupEnabled: true,
      });
    } finally {
      const resetRes = await apiClient.put('internal/slo/settings', {
        headers,
        body: DEFAULT_SETTINGS as Record<string, unknown>,
        responseType: 'json',
      });
      expect(resetRes).toHaveStatusCode(200);
    }
  });
});
