/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('CSM page views', () => {
    describe('when there is no data', () => {
      it('returns empty list', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/page-view-trends?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D'
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
      });
      it('returns empty list with breakdowns', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/page-view-trends?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D&breakdowns=%7B%22name%22%3A%22Browser%22%2C%22fieldName%22%3A%22user_agent.name%22%2C%22type%22%3A%22category%22%7D'
        );

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
      });
    });

    describe('when there is data', () => {
      before(async () => {
        await esArchiver.load('8.0.0');
        await esArchiver.load('rum_8.0.0');
      });
      after(async () => {
        await esArchiver.unload('8.0.0');
        await esArchiver.unload('rum_8.0.0');
      });

      it('returns page views', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/page-view-trends?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatch();
      });
      it('returns page views with breakdown', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/page-view-trends?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D&breakdowns=%7B%22name%22%3A%22Browser%22%2C%22fieldName%22%3A%22user_agent.name%22%2C%22type%22%3A%22category%22%7D'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatch();
      });
    });
  });
}
