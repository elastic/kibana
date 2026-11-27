/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { GLOBAL_SETTINGS_PATH, apiTest, mergeSloApiHeaders } from '../../fixtures';

const sloAllRole = (spaces: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { slo: ['all'] }, spaces }],
});

const SLI_RETENTION = { enabled: false, periodDays: 365 };

// Sent by the global check only: a 403 from the route-level privilege check has another message.
const ALL_SPACES_MESSAGE = 'Global SLO settings require the SLO "All" privilege in all spaces';

apiTest.describe('SLO global settings API authorization', { tag: tags.stateful.classic }, () => {
  apiTest(
    'rejects a user with the SLO All privilege in a single space',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(sloAllRole(['default']));
      const headers = mergeSloApiHeaders(apiKeyHeader);

      const getResponse = await apiClient.get(GLOBAL_SETTINGS_PATH, {
        headers,
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(403);
      expect(getResponse.body.message).toContain(ALL_SPACES_MESSAGE);

      const putResponse = await apiClient.put(GLOBAL_SETTINGS_PATH, {
        headers,
        body: { sliRetention: SLI_RETENTION },
        responseType: 'json',
      });
      expect(putResponse).toHaveStatusCode(403);
      expect(putResponse.body.message).toContain(ALL_SPACES_MESSAGE);
    }
  );

  apiTest(
    'allows a user with the SLO All privilege in all spaces',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(sloAllRole(['*']));
      const headers = mergeSloApiHeaders(apiKeyHeader);

      const getResponse = await apiClient.get(GLOBAL_SETTINGS_PATH, {
        headers,
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);

      // Saving the values just read leaves the deployment-wide settings unchanged.
      const { enabled, periodDays } = getResponse.body.sliRetention;
      const putResponse = await apiClient.put(GLOBAL_SETTINGS_PATH, {
        headers,
        body: { sliRetention: { enabled, periodDays } },
        responseType: 'json',
      });
      expect(putResponse).toHaveStatusCode(200);
    }
  );
});
