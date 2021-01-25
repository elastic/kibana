/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pick, sortBy } from 'lodash';
import url from 'url';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  describe('Transactions groups overview', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
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
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
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
            "APIRestController#customer",
            "APIRestController#topProducts",
            "APIRestController#orders",
            "APIRestController#product",
            "ResourceHttpRequestHandler",
            "APIRestController#products",
            "DispatcherServlet#doPost",
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
            0.734894148230161,
            0.496596820588832,
            0.465199881087606,
            0.269203783423923,
            0.142856373806016,
            0.0557715877137418,
            0,
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
      });

      it('sorts items in the correct order', async () => {
        const descendingResponse = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/overview`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
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
              numBuckets: 20,
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
              numBuckets: 20,
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
    });
  });
}
