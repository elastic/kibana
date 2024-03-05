/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';

import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  getServiceDashboardApi,
  getLinkServiceDashboardApi,
  deleteAllServiceDashboard,
} from './api_helper';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('synthtraceEsClient');

  const start = '2023-08-22T00:00:00.000Z';
  const end = '2023-08-22T00:15:00.000Z';

  registry.when(
    'Service dashboards when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles empty state', async () => {
          const response = await getServiceDashboardApi(apmApiClient, 'synth-go', start, end);
          expect(response.status).to.be(200);
          expect(response.body.serviceDashboards).to.eql([]);
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177119
  registry.when('Service dashboards when data is loaded', { config: 'basic', archives: [] }, () => {
    const range = timerange(new Date(start).getTime(), new Date(end).getTime());

    const goInstance = apm
      .service({
        name: 'synth-go',
        environment: 'production',
        agentName: 'go',
      })
      .instance('go-instance');

    const javaInstance = apm
      .service({
        name: 'synth-java',
        environment: 'production',
        agentName: 'java',
      })
      .instance('java-instance');

    before(async () => {
      return synthtrace.index([
        range
          .interval('1s')
          .rate(4)
          .generator((timestamp) =>
            goInstance
              .transaction({ transactionName: 'GET /api' })
              .timestamp(timestamp)
              .duration(1000)
              .success()
          ),
        range
          .interval('1s')
          .rate(4)
          .generator((timestamp) =>
            javaInstance
              .transaction({ transactionName: 'GET /api' })
              .timestamp(timestamp)
              .duration(1000)
              .success()
          ),
      ]);
    });

    after(() => {
      return synthtrace.clean();
    });

    afterEach(async () => {
      await deleteAllServiceDashboard(apmApiClient, 'synth-go', start, end);
    });

    describe('when data is not loaded', () => {
      it('creates a new service dashboard', async () => {
        const serviceDashboard = {
          dashboardSavedObjectId: 'dashboard-saved-object-id',
          serviceFiltersEnabled: true,
          kuery: 'service.name: synth-go',
        };
        const createResponse = await getLinkServiceDashboardApi({
          apmApiClient,
          ...serviceDashboard,
        });
        expect(createResponse.status).to.be(200);
        expect(createResponse.body).to.have.property('id');
        expect(createResponse.body).to.have.property('updatedAt');

        expect(createResponse.body).to.have.property(
          'dashboardSavedObjectId',
          serviceDashboard.dashboardSavedObjectId
        );
        expect(createResponse.body).to.have.property('kuery', serviceDashboard.kuery);
        expect(createResponse.body).to.have.property(
          'serviceEnvironmentFilterEnabled',
          serviceDashboard.serviceFiltersEnabled
        );
        expect(createResponse.body).to.have.property(
          'serviceNameFilterEnabled',
          serviceDashboard.serviceFiltersEnabled
        );

        const dasboardForGoService = await getServiceDashboardApi(
          apmApiClient,
          'synth-go',
          start,
          end
        );
        const dashboardForJavaService = await getServiceDashboardApi(
          apmApiClient,
          'synth-java',
          start,
          end
        );
        expect(dashboardForJavaService.body.serviceDashboards.length).to.be(0);
        expect(dasboardForGoService.body.serviceDashboards.length).to.be(1);
      });

      it('updates the existing linked service dashboard', async () => {
        const serviceDashboard = {
          dashboardSavedObjectId: 'dashboard-saved-object-id',
          serviceFiltersEnabled: true,
          kuery: 'service.name: synth-go or agent.name: java',
        };

        await getLinkServiceDashboardApi({
          apmApiClient,
          ...serviceDashboard,
        });

        const dasboardForGoService = await getServiceDashboardApi(
          apmApiClient,
          'synth-go',
          start,
          end
        );

        const updateResponse = await getLinkServiceDashboardApi({
          apmApiClient,
          customDashboardId: dasboardForGoService.body.serviceDashboards[0].id,
          ...serviceDashboard,
          serviceFiltersEnabled: true,
        });

        expect(updateResponse.status).to.be(200);

        const updateddasboardForGoService = await getServiceDashboardApi(
          apmApiClient,
          'synth-go',
          start,
          end
        );
        expect(updateddasboardForGoService.body.serviceDashboards.length).to.be(1);
        expect(updateddasboardForGoService.body.serviceDashboards[0]).to.have.property(
          'serviceEnvironmentFilterEnabled',
          true
        );
        expect(updateddasboardForGoService.body.serviceDashboards[0]).to.have.property(
          'serviceNameFilterEnabled',
          true
        );
        expect(updateddasboardForGoService.body.serviceDashboards[0]).to.have.property(
          'kuery',
          'service.name: synth-go or agent.name: java'
        );

        const dashboardForJavaService = await getServiceDashboardApi(
          apmApiClient,
          'synth-java',
          start,
          end
        );
        expect(dashboardForJavaService.body.serviceDashboards.length).to.be(1);
      });
    });
  });
}
