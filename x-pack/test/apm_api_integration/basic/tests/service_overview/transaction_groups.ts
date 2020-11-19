/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pick, uniqBy } from 'lodash';
import url from 'url';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  describe('Service overview transaction groups', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/overview_transaction_groups`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.eql({
          totalTransactionGroups: 0,
          transactionGroups: [],
          isAggregationAccurate: true,
        });
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/overview_transaction_groups`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
            },
          })
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body.totalTransactionGroups).toMatchInline(`12`);

        expectSnapshot(response.body.transactionGroups.map((group: any) => group.name))
          .toMatchInline(`
          Array [
            "DispatcherServlet#doGet",
            "APIRestController#stats",
            "APIRestController#topProducts",
            "APIRestController#order",
            "APIRestController#customer",
          ]
        `);

        expectSnapshot(response.body.transactionGroups.map((group: any) => group.impact))
          .toMatchInline(`
          Array [
            100,
            0.794579770440557,
            0.298214689777379,
            0.290932594821871,
            0.270655974123907,
          ]
        `);

        const firstItem = response.body.transactionGroups[0];

        expectSnapshot(
          pick(firstItem, 'name', 'latency.value', 'traffic.value', 'errorRate.value', 'impact')
        ).toMatchInline(`
          Object {
            "errorRate": Object {
              "value": 0.107142857142857,
            },
            "impact": 100,
            "latency": Object {
              "value": 996636.214285714,
            },
            "name": "DispatcherServlet#doGet",
            "traffic": Object {
              "value": 28,
            },
          }
        `);

        expectSnapshot(
          firstItem.latency.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`15`);

        expectSnapshot(
          firstItem.traffic.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`15`);

        expectSnapshot(
          firstItem.errorRate.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`3`);
      });

      it('sorts items in the correct order', async () => {
        const descendingResponse = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/overview_transaction_groups`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
            },
          })
        );

        expect(descendingResponse.status).to.be(200);

        const descendingOccurrences = descendingResponse.body.transactionGroups.map(
          (item: any) => item.impact
        );

        expect(descendingOccurrences).to.eql(descendingOccurrences.concat().sort().reverse());

        const ascendingResponse = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/overview_transaction_groups`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
            },
          })
        );

        const ascendingOccurrences = ascendingResponse.body.transactionGroups.map(
          (item: any) => item.impact
        );

        expect(ascendingOccurrences).to.eql(ascendingOccurrences.concat().sort().reverse());
      });

      it('sorts items by the correct field', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/overview_transaction_groups`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'latency',
            },
          })
        );

        expect(response.status).to.be(200);

        const latencies = response.body.transactionGroups.map((group: any) => group.latency.value);

        expect(latencies).to.eql(latencies.concat().sort().reverse());
      });

      it('paginates through the items', async () => {
        const size = 1;

        const firstPage = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/overview_transaction_groups`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
            },
          })
        );

        expect(firstPage.status).to.eql(200);

        const totalItems = firstPage.body.totalTransactionGroups;

        const pages = Math.floor(totalItems / size);

        const items = await new Array(pages)
          .fill(undefined)
          .reduce(async (prevItemsPromise, _, pageIndex) => {
            const prevItems = await prevItemsPromise;

            const thisPage = await supertest.get(
              url.format({
                pathname: '/api/apm/services/opbeans-java/overview_transaction_groups',
                query: {
                  start,
                  end,
                  uiFilters: '{}',
                  size,
                  numBuckets: 20,
                  pageIndex,
                  sortDirection: 'desc',
                  sortField: 'impact',
                },
              })
            );

            return prevItems.concat(thisPage.body.transactionGroups);
          }, Promise.resolve([]));

        expect(items.length).to.eql(totalItems);

        expect(uniqBy(items, 'name').length).to.eql(totalItems);
      });
    });
  });
}
