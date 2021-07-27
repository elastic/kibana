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
            "APIRestController#topProducts",
            "APIRestController#customerWhoBought",
            "ResourceHttpRequestHandler",
            "APIRestController#orders",
            "APIRestController#customer",
            "APIRestController#products",
            "APIRestController#product",
            "APIRestController#order",
            "APIRestController#stats",
            "APIRestController#customers",
            "DispatcherServlet#doPost",
          ]
        `);

        const impacts = transctionsGroupsPrimaryStatistics.transactionGroups.map(
          (group: any) => group.impact
        );
        expectSnapshot(impacts).toMatchInline(`
          Array [
            45.2518944682114,
            7.66727553895448,
            6.67159361826343,
            6.77808118340561,
            4.02770970947908,
            5.4534910738867,
            4.13361150758861,
            4.84592862623963,
            2.34043217891668,
            7.66153990342654,
            5.09839421730785,
            0.0700479743199733,
          ]
        `);

        expect(Math.round(sum(impacts))).to.eql(100);

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];

        expectSnapshot(pick(firstItem, 'name', 'latency', 'throughput', 'errorRate', 'impact'))
          .toMatchInline(`
          Object {
            "errorRate": 0.0181818181818182,
            "impact": 45.2518944682114,
            "latency": 33710.1272727273,
            "name": "DispatcherServlet#doGet",
            "throughput": 1.83333333333333,
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
        expectSnapshot(firstItem.latency).toMatchInline(`193944.6`);
      });
    }
  );
}
