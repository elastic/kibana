/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import { expectSnapshot } from '../../../common/match_snapshot';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

function sortTransactionGroups(items: any[]) {
  return sortBy(items, 'impact');
}

function omitSampleFromTransactionGroups(items: any[]) {
  return sortTransactionGroups(items).map(({ sample, ...item }) => ({ ...item }));
}

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
        expectSnapshot(response.body).toMatchInline(`
          Object {
            "bucketSize": 1000,
            "isAggregationAccurate": true,
            "items": Array [],
          }
        `);
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
        expectSnapshot(response.body.items.length).toMatchInline(`18`);
      });

      it('returns the correct buckets (when ignoring samples)', async () => {
        expectSnapshot(omitSampleFromTransactionGroups(response.body.items)).toMatch();
      });

      it('returns the correct buckets and samples', async () => {
        // sample should provide enough information to deeplink to a transaction detail page
        response.body.items.forEach((item: any) => {
          expect(item.sample.trace.id).to.be.an('string');
          expect(item.sample.transaction.id).to.be.an('string');
          expect(item.sample.service.name).to.be('opbeans-node');
          expect(item.sample.transaction.name).to.be(item.key);
        });
      });
    });
  });
}
