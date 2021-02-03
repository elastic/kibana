/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pick, sum } from 'lodash';
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

        const impacts = response.body.transactionGroups.map((group: any) => group.impact);
        expectSnapshot(impacts).toMatchInline(`
          Array [
            93.9295870910491,
            1.35334507158962,
            0.905514602241759,
            0.860178761411346,
            0.850308244392878,
            0.699947181217412,
            0.476138685202191,
            0.446650726277923,
            0.262571482598846,
            0.143906183235671,
            0.062116281544223,
            0.00973568923904662,
          ]
        `);

        expect(sum(impacts)).to.eql(100);

        const firstItem = response.body.transactionGroups[0];

        expectSnapshot(pick(firstItem, 'name', 'latency', 'throughput', 'errorRate', 'impact'))
          .toMatchInline(`
          Object {
            "errorRate": 0.0625,
            "impact": 93.9295870910491,
            "latency": 1044995.1875,
            "name": "DispatcherServlet#doGet",
            "throughput": 0.533333333333333,
          }
        `);
      });
    }
  );
}
