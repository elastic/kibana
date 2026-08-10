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

function pickKeys<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    out[k] = obj[k];
  }
  return out;
}

apiTest.describe(
  'SLO settings API (serverless)',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    apiTest('PUT updates setting', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      const headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const defaultSettings = pickKeys(DEFAULT_SETTINGS as Record<string, unknown>, [
        'staleThresholdInHours',
        'staleInstancesCleanupEnabled',
      ]);
      try {
        const updatedSettingsRes = await apiClient.put('internal/slo/settings', {
          headers,
          body: {
            staleThresholdInHours: 72,
            staleInstancesCleanupEnabled: true,
          },
          responseType: 'json',
        });
        expect(updatedSettingsRes).toHaveStatusCode(200);
        expect(updatedSettingsRes.body).toStrictEqual({
          staleThresholdInHours: 72,
          staleInstancesCleanupEnabled: true,
          useAllRemoteClusters: DEFAULT_SETTINGS.useAllRemoteClusters,
          selectedRemoteClusters: DEFAULT_SETTINGS.selectedRemoteClusters,
        });

        const retrievedRes = await apiClient.get('internal/slo/settings', {
          headers,
          responseType: 'json',
        });
        expect(retrievedRes).toHaveStatusCode(200);
        expect(retrievedRes.body).toStrictEqual({
          staleThresholdInHours: 72,
          staleInstancesCleanupEnabled: true,
          useAllRemoteClusters: DEFAULT_SETTINGS.useAllRemoteClusters,
          selectedRemoteClusters: DEFAULT_SETTINGS.selectedRemoteClusters,
        });
      } finally {
        const resetRes = await apiClient.put('internal/slo/settings', {
          headers,
          body: defaultSettings as Record<string, unknown>,
          responseType: 'json',
        });
        expect(resetRes).toHaveStatusCode(200);
      }
    });
  }
);
