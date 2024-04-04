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

        expect(response.body).to.be.eql([]);
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

        expect(response.body).to.have.length(1);
        expect(response.body[0]).to.have.property('dashboardFilterAssetIdEnabled', true);
        expect(response.body[0]).to.have.property('assetType', 'host');
        expect(response.body[0]).to.have.property('dashboardSavedObjectId', '123');
      });
    });

    describe('POST endpoint for saving custom dashboard', () => {
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

        expect(response.body).to.have.property('id');
        expect(response.body).to.have.property('dashboardFilterAssetIdEnabled', true);
        expect(response.body).to.have.property('assetType', 'host');
        expect(response.body).to.have.property('dashboardSavedObjectId', '123');
      });

      it('returns 400 when the dashboard already exist and tries to create it again', async () => {
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
        await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        const response = await supertest
          .post(getCustomDashboardsUrl('host'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(400);

        expect(response.body.error).to.be.eql('Bad Request');
        expect(response.body.message).to.be.eql(
          'Custom dashboard for host with id 123 already exist'
        );
      });
    });

    describe('PUT endpoint for updating custom dashboard', () => {
      it('responds with an error if Custom Dashboards UI setting is not enabled', async () => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest
          .put(getCustomDashboardsUrl('host', '123'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(403);
      });

      it('responds with an error when trying to update not existing dashboard', async () => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: true,
        };

        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });

        await supertest
          .put(getCustomDashboardsUrl('host', '000'))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(404);
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
            dashboardSavedObjectId: '456',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });
        const existingDashboardSavedObject = await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        const payload: InfraSaveCustomDashboardsRequestPayload = {
          dashboardSavedObjectId: '123',
          dashboardFilterAssetIdEnabled: false,
        };
        const updateResponse = await supertest
          .put(getCustomDashboardsUrl('host', existingDashboardSavedObject.id))
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(200);
        const getResponse = await supertest.get(getCustomDashboardsUrl('host')).expect(200);

        expect(updateResponse.body).to.be.eql({
          ...payload,
          assetType: 'host',
          id: updateResponse.body.id,
        });

        expect(getResponse.body).to.have.length(2);
        expect(getResponse.body[0]).to.have.property('dashboardSavedObjectId', '123');
        expect(getResponse.body[0]).to.have.property('dashboardFilterAssetIdEnabled', false);
        expect(getResponse.body[0]).to.have.property('assetType', 'host');
        expect(getResponse.body[1]).to.have.property('dashboardSavedObjectId', '456');
        expect(getResponse.body[1]).to.have.property('dashboardFilterAssetIdEnabled', true);
        expect(getResponse.body[1]).to.have.property('assetType', 'host');
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
        const existingDashboardSavedObject = await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: {
            assetType: 'host',
            dashboardSavedObjectId: '123',
            dashboardFilterAssetIdEnabled: true,
          },
          overwrite: true,
        });

        await supertest
          .delete(getCustomDashboardsUrl('host', existingDashboardSavedObject.id))
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const afterDeleteResponse = await supertest.get(getCustomDashboardsUrl('host')).expect(200);

        expect(afterDeleteResponse.body).to.be.eql([]);
      });
    });
  });
}
