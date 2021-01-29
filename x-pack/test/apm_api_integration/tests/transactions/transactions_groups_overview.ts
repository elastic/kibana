/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pick, uniqBy, sortBy } from 'lodash';
import url from 'url';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Transaction groups overview when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
              latencyAggregationType: 'avg',
              transactionType: 'request',
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
    }
  );

  registry.when(
    'Top transaction groups when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
              transactionType: 'request',
              latencyAggregationType: 'avg',
            },
          })
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body.totalTransactionGroups).toMatchInline(`12`);

        expectSnapshot(response.body.transactionGroups.map((group: any) => group.name))
          .toMatchInline(`
          Array [
            "DispatcherServlet#doGet",
            "APIRestController#customers",
            "APIRestController#order",
            "APIRestController#stats",
            "APIRestController#customerWhoBought",
          ]
        `);

        expectSnapshot(response.body.transactionGroups.map((group: any) => group.impact))
          .toMatchInline(`
          Array [
            100,
            1.43059146953109,
            0.953769516915408,
            0.905498741191481,
            0.894989230293471,
          ]
        `);

        const firstItem = response.body.transactionGroups[0];

        expectSnapshot(
          pick(firstItem, 'name', 'latency.value', 'throughput.value', 'errorRate.value', 'impact')
        ).toMatchInline(`
          Object {
            "errorRate": Object {
              "value": 0.0625,
            },
            "impact": 100,
            "latency": Object {
              "value": 1044995.1875,
            },
            "name": "DispatcherServlet#doGet",
            "throughput": Object {
              "value": 0.533333333333333,
            },
          }
        `);

        expectSnapshot(
          firstItem.latency.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`9`);

        expectSnapshot(
          firstItem.throughput.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`9`);

        expectSnapshot(
          firstItem.errorRate.timeseries.filter(({ y }: any) => y > 0).length
        ).toMatchInline(`1`);
      });

      it('sorts items in the correct order', async () => {
        const descendingResponse = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
              transactionType: 'request',
              latencyAggregationType: 'avg',
            },
          })
        );

        expect(descendingResponse.status).to.be(200);

        const descendingOccurrences = descendingResponse.body.transactionGroups.map(
          (item: any) => item.impact
        );

        expect(descendingOccurrences).to.eql(sortBy(descendingOccurrences.concat()).reverse());

        const ascendingResponse = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
              transactionType: 'request',
              latencyAggregationType: 'avg',
            },
          })
        );

        const ascendingOccurrences = ascendingResponse.body.transactionGroups.map(
          (item: any) => item.impact
        );

        expect(ascendingOccurrences).to.eql(sortBy(ascendingOccurrences.concat()).reverse());
      });

      it('sorts items by the correct field', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size: 5,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'latency',
              transactionType: 'request',
              latencyAggregationType: 'avg',
            },
          })
        );

        expect(response.status).to.be(200);

        const latencies = response.body.transactionGroups.map((group: any) => group.latency.value);

        expect(latencies).to.eql(sortBy(latencies.concat()).reverse());
      });

      it('paginates through the items', async () => {
        const size = 1;

        const firstPage = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              size,
              numBuckets: 20,
              pageIndex: 0,
              sortDirection: 'desc',
              sortField: 'impact',
              transactionType: 'request',
              latencyAggregationType: 'avg',
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
                pathname: '/api/apm/services/opbeans-java/transactions/groups/overview',
                query: {
                  start,
                  end,
                  uiFilters: '{}',
                  size,
                  numBuckets: 20,
                  pageIndex,
                  sortDirection: 'desc',
                  sortField: 'impact',
                  transactionType: 'request',
                  latencyAggregationType: 'avg',
                },
              })
            );

            return prevItems.concat(thisPage.body.transactionGroups);
          }, Promise.resolve([]));

        expect(items.length).to.eql(totalItems);

        expect(uniqBy(items, 'name').length).to.eql(totalItems);
      });
    }
  );
}
