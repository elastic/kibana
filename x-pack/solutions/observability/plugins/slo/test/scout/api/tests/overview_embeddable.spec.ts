/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import {
  apiTest,
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  SLO_OVERVIEW_EMBEDDABLE_ID,
} from '../fixtures';

apiTest.describe(
  'SLO Overview Embeddable',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let sloId: string;

    apiTest.beforeAll(async ({ requestAuth, sloData }) => {
      await sloData.generateSloData();
      const sloResult = await sloData.addSLO();
      if (!sloResult || typeof sloResult !== 'object' || !('id' in sloResult)) {
        throw new Error(`addSLO failed or returned invalid data: ${JSON.stringify(sloResult)}`);
      }
      sloId = (sloResult as { id: string }).id;
      adminCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.cleanStandardList();
    });

    apiTest(
      'creates a dashboard with an SLO single overview embeddable panel via REST API',
      async ({ apiClient }) => {
        expect(sloId).toBeDefined();

        const dashboardTitle = `Single Overview Test ${Date.now()}`;
        const singleOverviewPanel = {
          type: SLO_OVERVIEW_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slo_id: sloId,
            slo_instance_id: '*',
            overview_mode: 'single',
            title: 'SLO Single Overview',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [singleOverviewPanel],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.title).toBe(dashboardTitle);
        expect(response.body.data.panels).toBeDefined();
        expect(response.body.data.panels).toHaveLength(1);

        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.type).toBe(SLO_OVERVIEW_EMBEDDABLE_ID);
        expect(createdPanel.config).toBeDefined();
        expect(createdPanel.config.slo_id).toBe(sloId);
        expect(createdPanel.config.slo_instance_id).toBe('*');
        expect(createdPanel.config.overview_mode).toBe('single');
        expect(createdPanel.config.title).toBe('SLO Single Overview');
      }
    );

    apiTest(
      'defaults slo_instance_id to * when omitted in single overview panel config',
      async ({ apiClient }) => {
        expect(sloId).toBeDefined();

        const dashboardTitle = `Single Overview Default Instance ${Date.now()}`;
        const singleOverviewPanel = {
          type: SLO_OVERVIEW_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slo_id: sloId,
            overview_mode: 'single',
            title: 'SLO Single Overview',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [singleOverviewPanel],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.config.slo_instance_id).toBe('*');
      }
    );

    apiTest(
      'creates a dashboard with an SLO group overview embeddable panel via REST API',
      async ({ apiClient }) => {
        const dashboardTitle = `Group Overview Test ${Date.now()}`;
        const groupOverviewPanel = {
          type: SLO_OVERVIEW_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            overview_mode: 'groups',
            group_filters: {
              group_by: 'status',
              groups: ['healthy', 'degraded'],
              kql_query: 'slo.name: *',
            },
            title: 'SLO Group Overview',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [groupOverviewPanel],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.id).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.title).toBe(dashboardTitle);
        expect(response.body.data.panels).toBeDefined();
        expect(response.body.data.panels).toHaveLength(1);

        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.type).toBe(SLO_OVERVIEW_EMBEDDABLE_ID);
        expect(createdPanel.config).toBeDefined();
        expect(createdPanel.config.overview_mode).toBe('groups');
        expect(createdPanel.config.group_filters).toBeDefined();
        expect(createdPanel.config.group_filters.group_by).toBe('status');
        expect(createdPanel.config.group_filters.groups).toStrictEqual(['healthy', 'degraded']);
        expect(createdPanel.config.group_filters.kql_query).toBe('slo.name: *');
        expect(createdPanel.config.title).toBe('SLO Group Overview');
      }
    );

    apiTest(
      'creates a dashboard with minimal group overview panel config',
      async ({ apiClient }) => {
        const dashboardTitle = `Group Overview Minimal ${Date.now()}`;
        const groupOverviewPanel = {
          type: SLO_OVERVIEW_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            overview_mode: 'groups',
            title: 'SLO Group Overview Minimal',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [groupOverviewPanel],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.type).toBe(SLO_OVERVIEW_EMBEDDABLE_ID);
        expect(createdPanel.config.overview_mode).toBe('groups');
      }
    );

    apiTest(
      'rejects invalid overview panel config when overview_mode is missing',
      async ({ apiClient }) => {
        expect(sloId).toBeDefined();

        const dashboardTitle = `Invalid Overview ${Date.now()}`;
        const invalidPanel = {
          type: SLO_OVERVIEW_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slo_id: sloId,
            title: 'Invalid Overview Panel',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [invalidPanel],
          },
          responseType: 'json',
        });

        expect([400, 422]).toContain(response.statusCode);
        expect(response.body).toBeDefined();
        expect(response.body.message ?? response.body.error).toBeDefined();
      }
    );

    apiTest(
      'rejects invalid single overview panel config when slo_id is missing',
      async ({ apiClient }) => {
        const dashboardTitle = `Invalid Single Overview ${Date.now()}`;
        const invalidPanel = {
          type: SLO_OVERVIEW_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slo_instance_id: '*',
            overview_mode: 'single',
            title: 'Invalid Single Overview',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [invalidPanel],
          },
          responseType: 'json',
        });

        expect([400, 422]).toContain(response.statusCode);
        expect(response.body).toBeDefined();
        expect(response.body.message ?? response.body.error).toBeDefined();
      }
    );
  }
);
