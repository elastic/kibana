/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('CSM web core vitals', () => {
    describe('when there is no data', () => {
      it('returns empty list', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/web-core-vitals?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22elastic-co-rum-test%22%5D%7D'
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({
          cls: '0',
          fid: '0.00',
          lcp: '0.00',
          tbt: '0.00',
          fcp: 0,
          lcpRanks: [0, 0, 100],
          fidRanks: [0, 0, 100],
          clsRanks: [0, 0, 100],
        });
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

      it('returns web core vitals values', async () => {
        const response = await supertest.get(
          '/api/apm/rum-client/web-core-vitals?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters=%7B%22serviceName%22%3A%5B%22kibana-frontend-8_0_0%22%5D%7D'
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "cls": "0.00",
            "clsRanks": Array [
              100,
              0,
              0,
            ],
            "fcp": 1072,
            "fid": "1.35",
            "fidRanks": Array [
              0,
              0,
              100,
            ],
            "lcp": "1.27",
            "lcpRanks": Array [
              100,
              0,
              0,
            ],
            "tbt": 0,
          }
        `);
      });
    });
  });
}
