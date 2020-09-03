/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-08-26T11:00:00.000Z');
  const end = encodeURIComponent('2020-08-26T11:30:00.000Z');
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Error rate', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/transaction_groups/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );
        expect(response.status).to.be(200);
        expect(response.body).to.eql({
          noHits: true,
          erroneousTransactionsRate: [],
          average: null,
        });
      });
    });
    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns the transaction error rate', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-java/transaction_groups/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);

        expect(response.body).to.eql({
          noHits: false,
          erroneousTransactionsRate: [
            { x: 1598439600000, y: 0.5 },
            { x: 1598439630000, y: null },
            { x: 1598439660000, y: 0 },
            { x: 1598439690000, y: null },
            { x: 1598439720000, y: 0.14285714285714285 },
            { x: 1598439750000, y: 0 },
            { x: 1598439780000, y: 0 },
            { x: 1598439810000, y: null },
            { x: 1598439840000, y: 0 },
            { x: 1598439870000, y: 0 },
            { x: 1598439900000, y: 0 },
            { x: 1598439930000, y: null },
            { x: 1598439960000, y: 0 },
            { x: 1598439990000, y: 0 },
            { x: 1598440020000, y: 1 },
            { x: 1598440050000, y: null },
            { x: 1598440080000, y: null },
            { x: 1598440110000, y: null },
            { x: 1598440140000, y: 0.6666666666666666 },
            { x: 1598440170000, y: null },
            { x: 1598440200000, y: 0 },
            { x: 1598440230000, y: 0 },
            { x: 1598440260000, y: 0 },
            { x: 1598440290000, y: null },
            { x: 1598440320000, y: 0 },
            { x: 1598440350000, y: 0 },
            { x: 1598440380000, y: 0 },
            { x: 1598440410000, y: null },
            { x: 1598440440000, y: 0 },
            { x: 1598440470000, y: 0 },
            { x: 1598440500000, y: 1 },
            { x: 1598440530000, y: null },
            { x: 1598440560000, y: 0.25 },
            { x: 1598440590000, y: 0 },
            { x: 1598440620000, y: null },
            { x: 1598440650000, y: null },
            { x: 1598440680000, y: 0 },
            { x: 1598440710000, y: 0 },
            { x: 1598440740000, y: null },
            { x: 1598440770000, y: 0 },
            { x: 1598440800000, y: 0 },
            { x: 1598440830000, y: 0 },
            { x: 1598440860000, y: null },
            { x: 1598440890000, y: null },
            { x: 1598440920000, y: 0.3333333333333333 },
            { x: 1598440950000, y: 0.6666666666666666 },
            { x: 1598440980000, y: 0.5 },
            { x: 1598441010000, y: null },
            { x: 1598441040000, y: 0.14285714285714285 },
            { x: 1598441070000, y: 0.6666666666666666 },
            { x: 1598441100000, y: 0 },
            { x: 1598441130000, y: null },
            { x: 1598441160000, y: 0.5 },
            { x: 1598441190000, y: 0 },
            { x: 1598441220000, y: null },
            { x: 1598441250000, y: null },
            { x: 1598441280000, y: 0 },
            { x: 1598441310000, y: 0 },
            { x: 1598441340000, y: null },
            { x: 1598441370000, y: 1 },
            { x: 1598441400000, y: null },
          ],
          average: 0.18894993894993897,
        });
      });
    });
  });
}
