/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('UX page load dist without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get('/internal/apm/ux/page-load-distribution').query({
        start: '2020-09-07T20:35:54.654Z',
        end: '2020-09-14T20:35:54.654Z',
        uiFilters: '{"serviceName":["elastic-co-rum-test"]}',
      });

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatch();
    });

    it('returns empty list with breakdowns', async () => {
      const response = await supertest
        .get('/internal/apm/ux/page-load-distribution/breakdown')
        .query({
          start: '2020-09-07T20:35:54.654Z',
          end: '2020-09-14T20:35:54.654Z',
          uiFilters: '{"serviceName":["elastic-co-rum-test"]}',
          breakdown: 'Browser',
        });

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatch();
    });
  });

  registry.when(
    'UX page load dist with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns page load distribution', async () => {
        const response = await supertest.get('/internal/apm/ux/page-load-distribution').query({
          start: '2020-09-07T20:35:54.654Z',
          end: '2020-09-16T20:35:54.654Z',
          uiFilters: '{"serviceName":["kibana-frontend-8_0_0"]}',
        });

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatch();
      });
      it('returns page load distribution with breakdown', async () => {
        const response = await supertest
          .get('/internal/apm/ux/page-load-distribution/breakdown')
          .query({
            start: '2020-09-07T20:35:54.654Z',
            end: '2020-09-16T20:35:54.654Z',
            uiFilters: '{"serviceName":["kibana-frontend-8_0_0"]}',
            breakdown: 'Browser',
          });

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatch();
      });
    }
  );
}
