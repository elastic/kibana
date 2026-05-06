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
  assertDashboardCreateSuccess,
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  SLO_ALERTS_EMBEDDABLE_ID,
} from '../fixtures';

apiTest.describe(
  'SLO Alerts Embeddable',
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
      'creates a dashboard with an SLO alerts embeddable panel via REST API',
      async ({ apiClient }) => {
        expect(sloId).toBeDefined();

        const dashboardTitle = `Alerts Test ${Date.now()}`;
        const alertsPanel = {
          type: SLO_ALERTS_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slos: [{ slo_id: sloId, slo_instance_id: '*' }],
            title: 'SLO Alerts',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [alertsPanel],
          },
          responseType: 'json',
        });

        assertDashboardCreateSuccess(response);
        expect(response.body.id).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.title).toBe(dashboardTitle);
        expect(response.body.data.panels).toBeDefined();
        expect(response.body.data.panels).toHaveLength(1);

        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.type).toBe(SLO_ALERTS_EMBEDDABLE_ID);
        expect(createdPanel.config).toBeDefined();
        expect(createdPanel.config.slos).toHaveLength(1);
        expect(createdPanel.config.slos[0].slo_id).toBe(sloId);
        expect(createdPanel.config.slos[0].slo_instance_id).toBe('*');
        expect(createdPanel.config.title).toBe('SLO Alerts');
      }
    );

    apiTest(
      'creates a dashboard with an SLO alerts embeddable panel with multiple SLOs',
      async ({ apiClient }) => {
        expect(sloId).toBeDefined();

        const dashboardTitle = `Alerts Multi SLO Test ${Date.now()}`;
        const alertsPanel = {
          type: SLO_ALERTS_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slos: [
              { slo_id: sloId, slo_instance_id: '*' },
              { slo_id: sloId, slo_instance_id: 'instance-1' },
            ],
            title: 'Multi SLO Alerts',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [alertsPanel],
          },
          responseType: 'json',
        });

        assertDashboardCreateSuccess(response);

        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.config.slos).toHaveLength(2);
        expect(createdPanel.config.slos[0].slo_id).toBe(sloId);
        expect(createdPanel.config.slos[0].slo_instance_id).toBe('*');
        expect(createdPanel.config.slos[1].slo_id).toBe(sloId);
        expect(createdPanel.config.slos[1].slo_instance_id).toBe('instance-1');
      }
    );

    apiTest(
      'creates a dashboard with an SLO alerts embeddable panel with empty slos array',
      async ({ apiClient }) => {
        const dashboardTitle = `Alerts Empty SLOs Test ${Date.now()}`;
        const alertsPanel = {
          type: SLO_ALERTS_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slos: [],
            title: 'Empty Alerts',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [alertsPanel],
          },
          responseType: 'json',
        });

        assertDashboardCreateSuccess(response);

        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.config.slos).toHaveLength(0);
      }
    );

    apiTest(
      'rejects invalid alerts panel config when slo_id is missing from a slos item',
      async ({ apiClient }) => {
        const dashboardTitle = `Invalid Alerts ${Date.now()}`;
        const invalidPanel = {
          type: SLO_ALERTS_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slos: [{ slo_instance_id: '*' }],
            title: 'Invalid Alerts',
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
      'defaults slo_instance_id to * when omitted from a slos item',
      async ({ apiClient }) => {
        const dashboardTitle = `Alerts Default Instance ${Date.now()}`;
        const panel = {
          type: SLO_ALERTS_EMBEDDABLE_ID,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          config: {
            slos: [{ slo_id: sloId }],
            title: 'Default Instance Alerts',
          },
        };

        const response = await apiClient.post(DASHBOARD_API_PATH, {
          headers: {
            ...COMMON_HEADERS,
            ...adminCredentials.apiKeyHeader,
          },
          body: {
            title: dashboardTitle,
            panels: [panel],
          },
          responseType: 'json',
        });

        assertDashboardCreateSuccess(response);
        const createdPanel = response.body.data.panels[0];
        expect(createdPanel.config.slos).toHaveLength(1);
        expect(createdPanel.config.slos[0].slo_id).toBe(sloId);
        expect(createdPanel.config.slos[0].slo_instance_id).toBe('*');
      }
    );
  }
);
