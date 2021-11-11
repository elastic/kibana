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

  registry.when('CSM web core vitals without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get('/internal/apm/ux/web-core-vitals').query({
        start: '2020-09-07T20:35:54.654Z',
        end: '2020-09-14T20:35:54.654Z',
        uiFilters: '{"serviceName":["elastic-co-rum-test"]}',
        percentile: 50,
      });

      expect(response.status).to.be(200);
      expect(response.body).to.eql({
        coreVitalPages: 0,
        cls: null,
        tbt: 0,
        lcpRanks: [100, 0, 0],
        fidRanks: [100, 0, 0],
        clsRanks: [100, 0, 0],
      });
    });
  });

  registry.when(
    'CSM web core vitals with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns web core vitals values', async () => {
        const response = await supertest.get('/internal/apm/ux/web-core-vitals').query({
          start: '2020-09-07T20:35:54.654Z',
          end: '2020-09-16T20:35:54.654Z',
          uiFilters: '{"serviceName":["kibana-frontend-8_0_0"]}',
          percentile: 50,
        });

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "cls": 0,
            "clsRanks": Array [
              100,
              0,
              0,
            ],
            "coreVitalPages": 6,
            "fcp": 817.5,
            "fid": 1352.13,
            "fidRanks": Array [
              0,
              0,
              100,
            ],
            "lcp": 1019,
            "lcpRanks": Array [
              100,
              0,
              0,
            ],
            "tbt": 0,
          }
        `);
      });
    }
  );
}
