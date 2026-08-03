/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, testData } from '../fixtures';

/** Matches `INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE` in infra server saved_objects. */
const INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE = 'infra-custom-dashboards';

/** Matches `enableInfrastructureAssetCustomDashboards` in observability ui settings. */
const CUSTOM_DASHBOARDS_SETTING = 'observability:enableInfrastructureAssetCustomDashboards';

const getCustomDashboardsUrl = (assetType: string, dashboardSavedObjectId?: string) =>
  dashboardSavedObjectId
    ? `api/infra/${assetType}/custom-dashboards/${dashboardSavedObjectId}`
    : `api/infra/${assetType}/custom-dashboards`;

interface CustomDashboard {
  id?: string;
  assetType: string;
  dashboardSavedObjectId: string;
  dashboardFilterAssetIdEnabled: boolean;
}

apiTest.describe(
  'Infra Custom Dashboards API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...testData.COMMON_HEADERS, ...cookieHeader };
      await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: false });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({
        types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: false });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();
      await kbnClient.savedObjects.clean({
        types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
      });
    });

    apiTest(
      'GET responds with an error if Custom Dashboards UI setting is not enabled',
      async ({ apiClient }) => {
        const response = await apiClient.get(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );

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

    apiTest(
      'POST responds with an error if Custom Dashboards UI setting is not enabled',
      async ({ apiClient }) => {
        const response = await apiClient.post(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
          body: {
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'PUT responds with an error if Custom Dashboards UI setting is not enabled',
      async ({ apiClient }) => {
        const response = await apiClient.put(getCustomDashboardsUrl('host', '123'), {
          headers,
          responseType: 'json',
          body: {
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'DELETE responds with an error if Custom Dashboards UI setting is not enabled',
      async ({ apiClient }) => {
        const response = await apiClient.delete(getCustomDashboardsUrl('host', '123'), {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'GET responds with an empty configuration if custom dashboard saved object does not exist',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

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
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        await kbnClient.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        const response = await apiClient.get(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as CustomDashboard[];
        expect(body).toHaveLength(1);
        expect(body[0]).toStrictEqual(
          expect.objectContaining({
            dashboardFilterAssetIdEnabled: true,
            assetType: 'host',
            dashboardSavedObjectId: '123',
          })
        );
      }
    );

    apiTest(
      'POST responds with an error when trying to update a custom dashboard for unsupported asset type',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

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
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        const response = await apiClient.post(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
          body: {
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
        });

        expect(response).toHaveStatusCode(200);
        expect(typeof (response.body as { id?: unknown }).id).toBe('string');
        expect(response.body).toMatchObject({
          dashboardFilterAssetIdEnabled: true,
          assetType: 'host',
          dashboardSavedObjectId: '123',
        });
      }
    );

    apiTest(
      'POST returns 400 when the dashboard already exist and tries to create it again',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        await kbnClient.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        const response = await apiClient.post(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
          body: {
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            error: 'Bad Request',
            message: 'Dashboard with id 123 has already been linked to host',
          })
        );
      }
    );

    apiTest(
      'PUT responds with an error when trying to update non existing dashboard',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        const response = await apiClient.put(getCustomDashboardsUrl('host', '000'), {
          headers,
          responseType: 'json',
          body: {
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
        });
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'PUT updates existing dashboard configuration for a given asset type',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

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
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        const payload = {
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

        const getResponse = await apiClient.get(getCustomDashboardsUrl('host'), {
          headers,
          responseType: 'json',
        });
        expect(getResponse).toHaveStatusCode(200);

        expect(updateResponse.body).toStrictEqual({
          ...payload,
          assetType: 'host',
          id: (updateResponse.body as CustomDashboard).id,
        });

        const body = getResponse.body as CustomDashboard[];
        expect(body).toHaveLength(2);
        expect(body[0]).toStrictEqual(
          expect.objectContaining({
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: false,
            assetType: 'host',
          })
        );
        expect(body[1]).toStrictEqual(
          expect.objectContaining({
            dashboardSavedObjectId: '456',
            dashboardFilterAssetIdEnabled: true,
            assetType: 'host',
          })
        );
      }
    );

    apiTest(
      'DELETE responds with an error when trying to delete not existing dashboard',
      async ({ apiClient, kbnClient }) => {
        await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
        await kbnClient.uiSettings.waitForEventualCacheRefresh();

        const response = await apiClient.delete(getCustomDashboardsUrl('host', '000'), {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest('DELETE deletes an existing dashboard', async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({ [CUSTOM_DASHBOARDS_SETTING]: true });
      await kbnClient.uiSettings.waitForEventualCacheRefresh();

      const existingDashboardSavedObject = await kbnClient.savedObjects.create({
        type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
        attributes: {
          assetType: 'host',
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        },
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
