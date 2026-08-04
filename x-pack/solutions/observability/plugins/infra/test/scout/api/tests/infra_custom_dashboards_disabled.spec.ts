/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { InfraSaveCustomDashboardsRequestPayload } from '../../../../common/http_api/custom_dashboards_api';
import { INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../../../server/saved_objects';
import { apiTest, getCustomDashboardsUrl, testData } from '../fixtures';

const payload: InfraSaveCustomDashboardsRequestPayload = {
  dashboardSavedObjectId: '123',
  dashboardFilterAssetIdEnabled: true,
};

apiTest.describe(
  'Infra Custom Dashboards API when the UI setting is disabled',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({
        types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
      });
    });

    apiTest('GET responds with an error', async ({ apiClient }) => {
      const response = await apiClient.get(getCustomDashboardsUrl('host'), {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'GET responds with an error when trying to request a custom dashboard for unsupported asset type',
      async ({ apiClient }) => {
        const response = await apiClient.get(getCustomDashboardsUrl('unsupported-asset-type'), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest('POST responds with an error', async ({ apiClient }) => {
      const response = await apiClient.post(getCustomDashboardsUrl('host'), {
        headers,
        responseType: 'json',
        body: payload,
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('PUT responds with an error', async ({ apiClient }) => {
      const response = await apiClient.put(getCustomDashboardsUrl('host', '123'), {
        headers,
        responseType: 'json',
        body: payload,
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest('DELETE responds with an error', async ({ apiClient }) => {
      const response = await apiClient.delete(getCustomDashboardsUrl('host', '123'), {
        headers,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });
  }
);
