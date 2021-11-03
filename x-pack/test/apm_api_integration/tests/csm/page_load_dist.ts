/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('UX page load dist without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get(
        '/api/apm/rum-client/page-load-distribution?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D'
      );

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatch();
    });

    it('returns empty list with breakdowns', async () => {
      const response = await supertest.get(
        '/api/apm/rum-client/page-load-distribution/breakdown?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D&breakdown=Browser'
      );

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatch();
    });
  });

  registry.when(
    'UX page load dist with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns page load distribution', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/page-load-distribution?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatch();
      });
      it('returns page load distribution with breakdown', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/page-load-distribution/breakdown?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D&breakdown=Browser'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatch();
      });
    }
  );
}
