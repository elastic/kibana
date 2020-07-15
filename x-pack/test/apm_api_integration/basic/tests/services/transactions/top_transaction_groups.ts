/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import expectedTransactionGroups from './expectations/top_transaction_groups.json';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // url parameters
  const start = encodeURIComponent('2020-06-29T06:45:00.000Z');
  const end = encodeURIComponent('2020-06-29T06:49:00.000Z');
  const uiFilters = encodeURIComponent(JSON.stringify({}));
  const transactionType = 'request';

  describe('Top transaction groups', () => {
    describe('when data is not loaded ', () => {
      it('handles empty state', async () => {
        const response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ items: [], isAggregationAccurate: true, bucketSize: 1000 });
      });
    });

    describe('when data is loaded', () => {
      let response: any;
      before(async () => {
        await esArchiver.load('8.0.0');
        response = await supertest.get(
          `/api/apm/services/opbeans-node/transaction_groups?start=${start}&end=${end}&uiFilters=${uiFilters}&transactionType=${transactionType}`
        );
      });
      after(() => esArchiver.unload('8.0.0'));

      it('returns the correct status code', async () => {
        expect(response.status).to.be(200);
      });

      it('returns the correct number of buckets', async () => {
        expect(response.body.items.length).to.be(18);
      });

      it('returns the correct buckets (when ignoring samples)', async () => {
        function omitSample(items: any[]) {
          return items.map(({ sample, ...item }) => ({ ...item }));
        }

        expect(omitSample(response.body.items)).to.eql(omitSample(expectedTransactionGroups.items));
      });

      it('returns the correct buckets and samples', async () => {
        expect(response.body.items).to.eql(expectedTransactionGroups.items);
      });
    });
  });
}
