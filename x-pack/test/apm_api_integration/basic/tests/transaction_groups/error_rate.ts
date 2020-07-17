/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import expectedErrorRate from './expectation/error_rate.json';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Error rate', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
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
          `/api/apm/services/opbeans-node/transaction_groups/error_rate?start=${start}&end=${end}&uiFilters=${uiFilters}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql(expectedErrorRate);
      });
    });
  });
}
