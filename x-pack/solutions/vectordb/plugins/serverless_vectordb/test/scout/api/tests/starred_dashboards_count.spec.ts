/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, STARRED_DASHBOARDS_COUNT_API_PATH } from '../fixtures';

const EXISTING_DASHBOARD_ID = `vectordb-scout-dashboard-${randomUUID()}`;
const DELETED_DASHBOARD_ID = `vectordb-scout-missing-${randomUUID()}`;

// `schema.arrayOf(..., { maxSize: FAVORITES_LIMIT })` on the route, mirroring the favorites cap
const FAVORITES_LIMIT = 100;

// Kibana access, but none to dashboards
const NO_DASHBOARDS_ROLE = {
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
  elasticsearch: { cluster: [], indices: [] },
};

apiTest.describe(
  'Vector DB starred dashboards count API',
  { tag: [...tags.serverless.vectordb] },
  () => {
    apiTest.beforeAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: EXISTING_DASHBOARD_ID,
        attributes: { title: 'Vector DB Scout dashboard' },
        overwrite: true,
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.delete({ type: 'dashboard', id: EXISTING_DASHBOARD_ID });
    });

    apiTest(
      'counts only the starred dashboards that still exist',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.post(STARRED_DASHBOARDS_COUNT_API_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { dashboardIds: [EXISTING_DASHBOARD_ID, DELETED_DASHBOARD_ID] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ count: 1 });
      }
    );

    apiTest('counts nothing when no dashboards are starred', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      const response = await apiClient.post(STARRED_DASHBOARDS_COUNT_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { dashboardIds: [] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ count: 0 });
    });

    apiTest('counts dashboards for the viewer role', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

      const response = await apiClient.post(STARRED_DASHBOARDS_COUNT_API_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { dashboardIds: [EXISTING_DASHBOARD_ID] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ count: 1 });
    });

    apiTest(
      'returns no count for a user without dashboard access',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NO_DASHBOARDS_ROLE);

        const response = await apiClient.post(STARRED_DASHBOARDS_COUNT_API_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { dashboardIds: [EXISTING_DASHBOARD_ID] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ count: null });
      }
    );

    apiTest(
      'refuses more dashboard IDs than a user can favorite',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.post(STARRED_DASHBOARDS_COUNT_API_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            dashboardIds: Array.from(
              { length: FAVORITES_LIMIT + 1 },
              (_, index) => `dashboard-${index}`
            ),
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest('rejects an unauthenticated request', async ({ apiClient }) => {
      const response = await apiClient.post(STARRED_DASHBOARDS_COUNT_API_PATH, {
        headers: COMMON_HEADERS,
        body: { dashboardIds: [EXISTING_DASHBOARD_ID] },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(401);
    });
  }
);
