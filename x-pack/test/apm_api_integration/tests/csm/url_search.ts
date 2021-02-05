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
  const supertest = getService('supertest');

  registry.when('CSM url search api without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get(
        '/api/apm/rum-client/url-search?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D&percentile=50'
      );

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatchInline(`
            Object {
              "items": Array [],
              "total": 0,
            }
          `);
    });
  });

  registry.when(
    'CSM url search api with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns top urls when no query', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/url-search?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D&percentile=50'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
            Object {
              "items": Array [
                Object {
                  "count": 5,
                  "pld": 4924000,
                  "url": "http://localhost:5601/nfw/app/csm?rangeFrom=now-15m&rangeTo=now&serviceName=kibana-frontend-8_0_0",
                },
                Object {
                  "count": 1,
                  "pld": 2760000,
                  "url": "http://localhost:5601/nfw/app/home",
                },
              ],
              "total": 2,
            }
          `);
      });

      it('returns specific results against query', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/url-search?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D&urlQuery=csm&percentile=50'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
            Object {
              "items": Array [
                Object {
                  "count": 5,
                  "pld": 4924000,
                  "url": "http://localhost:5601/nfw/app/csm?rangeFrom=now-15m&rangeTo=now&serviceName=kibana-frontend-8_0_0",
                },
              ],
              "total": 1,
            }
          `);
      });
    }
  );
}
