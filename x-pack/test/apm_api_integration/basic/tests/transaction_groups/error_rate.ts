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
  const start = encodeURIComponent('2020-08-25T12:51:30.000Z');
  const end = encodeURIComponent('2020-08-25T12:54:30.000Z');
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
            { x: 1598359890000, y: 0.03333333333333333 },
            { x: 1598359920000, y: 0.09333333333333334 },
            { x: 1598359950000, y: 0.014492753623188406 },
            { x: 1598359980000, y: 0.1267605633802817 },
            { x: 1598360010000, y: 0.07462686567164178 },
            { x: 1598360040000, y: 0.06578947368421052 },
            { x: 1598360070000, y: null },
          ],
          average: 0.06805605383766485,
        });
      });
    });
  });
}
