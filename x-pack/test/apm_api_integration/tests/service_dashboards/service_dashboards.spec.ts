/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { DashboardTypeEnum } from '../../../../plugins/apm/common/service_dashboards';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  getServiceDashboardApi,
  getLinkServiceDashboardApi,
  deleteAllServiceDashboard,
} from './api_helper';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  registry.when('Service dashboard link', { config: 'basic', archives: [] }, () => {
    afterEach(async () => {
      await deleteAllServiceDashboard(apmApiClient, 'synth');
    });

    it('creates a new service dashboard', async () => {
      const serviceDashboard = {
        serviceName: 'synth',
        dashboardTitle: 'my dashboard',
        dashboardSavedObjectId: 'dashboard-saved-object-id',
        linkTo: DashboardTypeEnum.single,
        useContextFilter: true,
        kuery: '',
      };
      const createResponse = await getLinkServiceDashboardApi({
        apmApiClient,
        ...serviceDashboard,
      });
      expect(createResponse.status).to.be(200);
      expect(createResponse.body).to.have.property('id');
      expect(createResponse.body).to.have.property('updatedAt');

      expect(createResponse.body).to.have.property('serviceName', serviceDashboard.serviceName);
      expect(createResponse.body).to.have.property(
        'dashboardTitle',
        serviceDashboard.dashboardTitle
      );

      expect(createResponse.body).to.have.property(
        'dashboardSavedObjectId',
        serviceDashboard.dashboardSavedObjectId
      );
      expect(createResponse.body).to.have.property(
        'useContextFilter',
        serviceDashboard.useContextFilter
      );
      expect(createResponse.body).to.have.property('linkTo', serviceDashboard.linkTo);

      const serviceDashboardResponse = await getServiceDashboardApi(apmApiClient, 'synth');
      expect(serviceDashboardResponse.body.serviceDashboards.length).to.be(1);
    });

    it('updates the existing linked service dashboard', async () => {
      const serviceDashboard = {
        serviceName: 'synth',
        dashboardTitle: 'my dashboard',
        dashboardSavedObjectId: 'dashboard-saved-object-id',
        linkTo: DashboardTypeEnum.single,
        useContextFilter: true,
        kuery: '',
      };

      await getLinkServiceDashboardApi({
        apmApiClient,
        ...serviceDashboard,
      });

      const serviceDashboardResponse = await getServiceDashboardApi(apmApiClient, 'synth');

      const updateResponse = await getLinkServiceDashboardApi({
        apmApiClient,
        serviceDashboardId: serviceDashboardResponse.body.serviceDashboards[0].id,
        ...serviceDashboard,
        useContextFilter: true,
      });

      expect(updateResponse.status).to.be(200);

      const updatedServiceDashboardResponse = await getServiceDashboardApi(apmApiClient, 'synth');
      expect(updatedServiceDashboardResponse.body.serviceDashboards.length).to.be(1);
      expect(updatedServiceDashboardResponse.body.serviceDashboards[0]).to.have.property(
        'useContextFilter',
        true
      );
    });
  });
}
