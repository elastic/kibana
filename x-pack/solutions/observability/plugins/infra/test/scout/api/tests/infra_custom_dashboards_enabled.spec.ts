/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { enableInfrastructureAssetCustomDashboards } from '@kbn/observability-plugin/common';
import type {
  InfraCustomDashboard,
  InfraSavedCustomDashboard,
} from '../../../../common/custom_dashboards';
import type { InfraSaveCustomDashboardsRequestPayload } from '../../../../common/http_api/custom_dashboards_api';
import { INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../../../server/saved_objects';
import { apiTest, getCustomDashboardsUrl, testData } from '../fixtures';

const hostDashboard: InfraCustomDashboard = {
  assetType: 'host',
  dashboardSavedObjectId: '123',
  dashboardFilterAssetIdEnabled: true,
};

apiTest.describe(
  'Infra Custom Dashboards API when the UI setting is enabled',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };

      await kbnClient.uiSettings.update({
        [enableInfrastructureAssetCustomDashboards]: true,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({
        types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [enableInfrastructureAssetCustomDashboards]: false,
      });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
      await kbnClient.savedObjects.clean({
        types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
      });
    });

    apiTest(
      'GET responds with an empty configuration if custom dashboard saved object does not exist',
      async ({ apiClient }) => {
        const response = await apiClient.get(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual([]);
      }
    );

    apiTest(
      'GET responds with the custom dashboard configuration for a given asset type when it exists',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: hostDashboard,
          overwrite: true,
        });

        const response = await apiClient.get(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const dashboards = response.body as InfraSavedCustomDashboard[];
        expect(dashboards).toHaveLength(1);
        expect(dashboards[0]).toMatchObject({
          dashboardFilterAssetIdEnabled: true,
          assetType: 'host',
          dashboardSavedObjectId: '123',
        });
      }
    );

    apiTest(
      'POST responds with an error when trying to update a custom dashboard for unsupported asset type',
      async ({ apiClient }) => {
        const response = await apiClient.post(getCustomDashboardsUrl('unsupported-asset-type'), {
          headers,
          responseType: 'json',
          body: {
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'POST creates a new dashboard configuration when saving for the first time',
      async ({ apiClient }) => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };

        const response = await apiClient.post(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
          body: payload,
        });

        expect(response).toHaveStatusCode(200);

        const dashboard = response.body as InfraSavedCustomDashboard;
        expect(typeof dashboard.id).toBe('string');
        expect(dashboard).toMatchObject({
          dashboardFilterAssetIdEnabled: true,
          assetType: 'host',
          dashboardSavedObjectId: '123',
        });
      }
    );

    apiTest(
      'POST returns 400 when the dashboard already exist and tries to create it again',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: hostDashboard,
          overwrite: true,
        });

        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };

        const response = await apiClient.post(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
          body: payload,
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body).toMatchObject({
          error: 'Bad Request',
          message: 'Dashboard with id 123 has already been linked to host',
        });
      }
    );

    apiTest(
      'PUT responds with an error when trying to update non existing dashboard',
      async ({ apiClient }) => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };

        const response = await apiClient.put(getCustomDashboardsUrl('host', '000'), {
          headers,
          responseType: 'json',
          body: payload,
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'PUT updates existing dashboard configuration for a given asset type',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '456',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });
        const existingDashboardSavedObject = await kbnClient.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: hostDashboard,
          overwrite: true,
        });

        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: false,
        };
        const updateResponse = await apiClient.put(
          getCustomDashboardsUrl('host', existingDashboardSavedObject.id),
          {
            headers,
            responseType: 'json',
            body: payload,
          }
        );
        expect(updateResponse).toHaveStatusCode(200);
        expect(updateResponse.body).toStrictEqual({
          ...payload,
          assetType: 'host',
          id: (updateResponse.body as InfraSavedCustomDashboard).id,
        });

        const getResponse = await apiClient.get(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
        });
        expect(getResponse).toHaveStatusCode(200);

        const dashboards = getResponse.body as InfraSavedCustomDashboard[];
        expect(dashboards).toHaveLength(2);
        expect(dashboards[0]).toMatchObject({
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: false,
          assetType: 'host',
        });
        expect(dashboards[1]).toMatchObject({
          dashboardSavedObjectId: '456',
          dashboardFilterAssetIdEnabled: true,
          assetType: 'host',
        });
      }
    );

    apiTest(
      'DELETE responds with an error when trying to delete not existing dashboard',
      async ({ apiClient }) => {
        const response = await apiClient.delete(getCustomDashboardsUrl('host', '000'), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('DELETE deletes an existing dashboard', async ({ apiClient, kbnClient }) => {
      const existingDashboardSavedObject = await kbnClient.savedObjects.create({
        type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
        attributes: hostDashboard,
        overwrite: true,
      });

      const deleteResponse = await apiClient.delete(
        getCustomDashboardsUrl('host', existingDashboardSavedObject.id),
        {
          headers,
          responseType: 'json',
        }
      );
      expect(deleteResponse).toHaveStatusCode(200);

      const afterDeleteResponse = await apiClient.get(getCustomDashboardsUrl('host'), {
        headers,
        responseType: 'json',
      });
      expect(afterDeleteResponse).toHaveStatusCode(200);
      expect(afterDeleteResponse.body).toStrictEqual([]);
    });
  }
);
