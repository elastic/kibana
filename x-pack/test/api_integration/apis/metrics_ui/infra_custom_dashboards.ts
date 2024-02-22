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

const CUSTOM_DASHBOARDS_API_URL = '/api/infra/custom-dashboards';

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

        await supertest.get(`${CUSTOM_DASHBOARDS_API_URL}/host`).expect(403);
      });

      it('responds with an error when trying to request a custom dashboard for unsupported asset type', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest.get(`${CUSTOM_DASHBOARDS_API_URL}/unsupported-asset-type`).expect(400);
      });

      it('responds with an empty configuration if custom dashboard saved object does not exist', async () => {
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.clean({
          types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
        });

        const response = await supertest.get(`${CUSTOM_DASHBOARDS_API_URL}/host`).expect(200);

        expect(response.body).to.be.eql({
          assetType: 'host',
          dashboardIdList: [],
        });
      });

      it('responds with the custom dashboard configuration for a given asset type when it exists', async () => {
        const customDashboard: InfraCustomDashboard = {
          assetType: 'host',
          dashboardIdList: ['123'],
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.create({
          type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          attributes: customDashboard,
          overwrite: true,
        });

        const response = await supertest.get(`${CUSTOM_DASHBOARDS_API_URL}/host`).expect(200);

        expect(response.body).to.be.eql(customDashboard);
      });
    });

    describe('POST endpoint for saving (creating or updating) custom dashboard', () => {
      it('responds with an error if Custom Dashboards UI setting is not enabled', async () => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          assetType: 'host',
          dashboardIdList: ['123'],
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: false,
        });

        await supertest
          .post(`${CUSTOM_DASHBOARDS_API_URL}`)
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(403);
      });

      it('responds with an error when trying to update a custom dashboard for unsupported asset type', async () => {
        const payload = {
          assetType: 'unsupported-asset-type',
          dashboardIdList: ['123'],
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });

        await supertest
          .post(`${CUSTOM_DASHBOARDS_API_URL}`)
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(400);
      });

      it('creates a new dashboard configuration when saving for the first time', async () => {
        const payload: InfraSaveCustomDashboardsRequestPayload = {
          assetType: 'host',
          dashboardIdList: ['123'],
        };
        await kibanaServer.uiSettings.update({
          [enableInfrastructureAssetCustomDashboards]: true,
        });
        await kibanaServer.savedObjects.clean({
          types: [INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE],
        });

        const response = await supertest
          .post(`${CUSTOM_DASHBOARDS_API_URL}`)
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(200);

        expect(response.body).to.be.eql(payload);
      });

      it('updates existing dashboard configuration when for a given asset type', async () => {
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
            dashboardIdList: ['123'],
          },
          overwrite: true,
        });

        const payload: InfraSaveCustomDashboardsRequestPayload = {
          assetType: 'host',
          dashboardIdList: ['123', '456'],
        };
        const updateResponse = await supertest
          .post(`${CUSTOM_DASHBOARDS_API_URL}`)
          .set('kbn-xsrf', 'xxx')
          .send(payload)
          .expect(200);
        const getResponse = await supertest.get(`${CUSTOM_DASHBOARDS_API_URL}/host`).expect(200);

        expect(updateResponse.body).to.be.eql(payload);
        expect(getResponse.body).to.be.eql(payload);
      });
    });
  });
}
