/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick, sum } from 'lodash';
import url from 'url';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

type TransactionsGroupsPrimaryStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Transaction groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/main_statistics`,
            query: {
              start,
              end,
              latencyAggregationType: 'avg',
              transactionType: 'request',
            },
          })
        );

        expect(response.status).to.be(200);
        const transctionsGroupsPrimaryStatistics = response.body as TransactionsGroupsPrimaryStatistics;
        expect(transctionsGroupsPrimaryStatistics.transactionGroups).to.empty();
        expect(transctionsGroupsPrimaryStatistics.isAggregationAccurate).to.be(true);
      });
    }
  );

  registry.when(
    'Transaction groups main statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/main_statistics`,
            query: {
              start,
              end,
              transactionType: 'request',
              latencyAggregationType: 'avg',
            },
          })
        );

        expect(response.status).to.be(200);

        const transctionsGroupsPrimaryStatistics = response.body as TransactionsGroupsPrimaryStatistics;

        expectSnapshot(
          transctionsGroupsPrimaryStatistics.transactionGroups.map((group: any) => group.name)
        ).toMatchInline(`
          Array [
            "DispatcherServlet#doGet",
            "ResourceHttpRequestHandler",
            "APIRestController#customerWhoBought",
            "APIRestController#topProducts",
            "APIRestController#order",
            "APIRestController#customer",
            "APIRestController#stats",
            "APIRestController#product",
            "APIRestController#products",
            "APIRestController#customers",
            "APIRestController#orders",
          ]
        `);

        const impacts = transctionsGroupsPrimaryStatistics.transactionGroups.map(
          (group: any) => group.impact
        );
        expectSnapshot(impacts).toMatchInline(`
          Array [
            82.2566386523884,
            0.550268848003875,
            2.18961795050566,
            2.22111156210036,
            1.56739768205378,
            2.03144456685581,
            3.35707136969079,
            1.71733679850543,
            1.1557171279893,
            2.35878129236824,
            0.594614149538393,
          ]
        `);

        expect(Math.round(sum(impacts))).to.eql(100);

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];

        expectSnapshot(pick(firstItem, 'name', 'latency', 'throughput', 'errorRate', 'impact'))
          .toMatchInline(`
          Object {
            "errorRate": 0.103448275862069,
            "impact": 82.2566386523884,
            "latency": 172922.586206897,
            "name": "DispatcherServlet#doGet",
            "throughput": 1.93333333333333,
          }
        `);
      });

      it('returns the correct data for latency aggregation 99th percentile', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/main_statistics`,
            query: {
              start,
              end,
              transactionType: 'request',
              latencyAggregationType: 'p99',
            },
          })
        );

        expect(response.status).to.be(200);

        const transctionsGroupsPrimaryStatistics = response.body as TransactionsGroupsPrimaryStatistics;

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];
        expectSnapshot(firstItem.latency).toMatchInline(`6801325.08000001`);
      });
    }
  );
}
