/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import expectedBreakdown from './expectation/breakdown.json';
import expectedBreakdownWithTransactionName from './expectation/breakdown_transaction_name.json';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
  const transactionType = 'request';
  const transactionName = 'GET /api';
  const uiFilters = encodeURIComponent(JSON.stringify({}));

  describe('Breakdown', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );
        expect(response.status).to.be(200);
        expect(response.body).to.eql({ kpis: [], timeseries: [] });
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns the transaction breakdown for a service', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql(expectedBreakdown);
      });
      it('returns the transaction breakdown for a transaction group', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}&transactionName=${transactionName}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql(expectedBreakdownWithTransactionName);
      });
      it('returns the kpis sorted by percentage and name', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups/breakdown?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);
        expect(response.body.kpis).to.eql([
          { name: 'app', percentage: 0.16700861715223636, color: '#54b399' },
          { name: 'http', percentage: 0.7702092736971686, color: '#6092c0' },
          { name: 'postgresql', percentage: 0.0508822322527698, color: '#d36086' },
          { name: 'redis', percentage: 0.011899876897825195, color: '#9170b8' },
        ]);
      });
    });
  });
}
