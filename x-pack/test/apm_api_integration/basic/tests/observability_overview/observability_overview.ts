/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:00:00.000Z');
  const end = encodeURIComponent('2020-06-29T10:00:00.000Z');
  const bucketSize = '60s';

  describe('Observability overview', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/observability_overview?start=${start}&end=${end}&bucketSize=${bucketSize}`
        );
        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`
          Object {
            "serviceCount": 0,
            "transactionCoordinates": Array [],
          }
        `);
      });
    });
    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns the service count and transaction coordinates', async () => {
        const response = await supertest.get(
          `/api/apm/observability_overview?start=${start}&end=${end}&bucketSize=${bucketSize}`
        );
        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatchInline(`
          Object {
            "serviceCount": 3,
            "transactionCoordinates": Array [
              Object {
                "x": 1593413220000,
                "y": 0.016666666666666666,
              },
              Object {
                "x": 1593413280000,
                "y": 1.0458333333333334,
              },
            ],
          }
        `);
      });
    });
  });
}
