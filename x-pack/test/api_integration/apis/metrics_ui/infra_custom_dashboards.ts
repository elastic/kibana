/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { InfraCustomDashboard } from '@kbn/infra-plugin/common/custom_dashboards';
import { InfraSaveCustomDashboardsRequestPayload } from '@kbn/infra-plugin/common/http_api/custom_dashboards_api';
import { INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '@kbn/infra-plugin/server/saved_objects';
import { enableInfrastructureAssetCustomDashboards } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

const getCustomDashboardsUrl = (assetType: string, dashboardSavedObjectId?: string) =>
  dashboardSavedObjectId
    ? `/api/infra/${assetType}/custom-dashboards/${dashboardSavedObjectId}`
    : `/api/infra/${assetType}/custom-dashboards`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  describe('Infra Custom Dashboards API', () => {
    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
      });
    });

    describe('GET endpoint for fetching custom dashboard', () => {
      it('responds with an error if Custom Dashboards UI setting is not enabled', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest.get(getCustomDashboardsUrl('host')).expect(403);
      });

      it('responds with an error when trying to request a custom dashboard for unsupported asset type', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest.get(getCustomDashboardsUrl('unsupported-asset-type')).expect(400);
      });

      it('responds with an empty configuration if custom dashboard saved object does not exist', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.clean({
          types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
        });

        const response = await supertest.get(getCustomDashboardsUrl('host')).expect(200);

        expect(response.body).to.be.eql([
          {
            assetType: 'host',
            dashboardSavedObjectId: '',
            dashboardFilterAssetIdEnabled: false,
          },
        ]);
      });

      it('responds with the custom dashboard configuration for a given asset type when it exists', async () => {
        const customDashboard: InfraCustomDashboard = {
          assetType: 'host',
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: customDashboard,
          overwrite: true,
        });

        const response = await supertest.get(getCustomDashboardsUrl('host')).expect(200);

        expect(response.body).to.be.eql([customDashboard]);
      });
    });

    describe('POST endpoint for saving (creating or updating) custom dashboard', () => {
      it('responds with an error if Custom Dashboards UI setting is not enabled', async () => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest
          .post(getCustomDashboardsUrl('host'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(403);
      });

      it('responds with an error when trying to update a custom dashboard for unsupported asset type', async () => {
        const payload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });

        await supertest
          .post(getCustomDashboardsUrl('unsupported-asset-type'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(400);
      });

      it('creates a new dashboard configuration when saving for the first time', async () => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.clean({
          types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
        });

        const response = await supertest
          .post(getCustomDashboardsUrl('host'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(200);

        expect(response.body).to.be.eql({ ...payload, assetType: 'host' });
      });

      it('updates existing dashboard configuration for a given asset type', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.clean({
          types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
        });
        await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });
        await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '456',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: false,
        };
        const updateResponse = await supertest
          .post(getCustomDashboardsUrl('host'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(200);
        const getResponse = await supertest.get(getCustomDashboardsUrl('host')).expect(200);

        expect(updateResponse.body).to.be.eql({ ...payload, assetType: 'host' });
        expect(getResponse.body).to.be.eql([
          {
            dashboardSavedObjectId: '456',
            dashboardFilterAssetIdEnabled: true,
            assetType: 'host',
          },
          { ...payload, assetType: 'host' },
        ]);
      });
    });

    describe('DELETE endpoint for removing a custom dashboard', () => {
      it('responds with an error if Custom Dashboards UI setting is not enabled', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest
          .delete(getCustomDashboardsUrl('host', '123'))
          .set('kbn-xsrf', 'xxx')
          .expect(403);
      });

      it('responds with an error when trying to delete not existing dashboard', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });

        await supertest
          .delete(getCustomDashboardsUrl('host', '000'))
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });

      it('deletes an existing dashboard', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.clean({
          types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
        });
        await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        await supertest
          .delete(getCustomDashboardsUrl('host', '123'))
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const afterDeleteResponse = await supertest.get(getCustomDashboardsUrl('host')).expect(200);

        expect(afterDeleteResponse.body).to.be.eql([
          {
            assetType: 'host',
            dashboardSavedObjectId: '',
            dashboardFilterAssetIdEnabled: false,
          },
        ]);
      });
    });
  });
}
