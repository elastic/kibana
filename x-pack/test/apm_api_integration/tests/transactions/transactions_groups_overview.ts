/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pick } from 'lodash';
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
              latencyAggregationType: 'avg',
              transactionType: 'request',
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body.transactionGroups).to.empty();
        expect(response.body.isAggregationAccurate).to.be(true);
        expect(response.body.requestId).to.not.empty();
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
              transactionType: 'request',
              latencyAggregationType: 'avg',
            },
          })
        );

        expect(response.status).to.be(200);

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

        expectSnapshot(pick(firstItem, 'name', 'latency', 'throughput', 'errorRate', 'impact'))
          .toMatchInline(`
          Object {
            "errorRate": 0.0625,
            "impact": 100,
            "latency": 1044995.1875,
            "name": "DispatcherServlet#doGet",
            "throughput": 0.533333333333333,
          }
        `);
      });
    }
  );
}
