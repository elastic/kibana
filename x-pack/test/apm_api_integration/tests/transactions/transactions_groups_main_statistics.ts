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
            "APIRestController#customerWhoBought",
            "APIRestController#order",
            "APIRestController#customer",
            "ResourceHttpRequestHandler",
            "APIRestController#customers",
            "APIRestController#topProducts",
            "APIRestController#orders",
            "APIRestController#stats",
            "APIRestController#product",
            "APIRestController#products",
            "DispatcherServlet#doPost",
          ]
        `);

        const impacts = transctionsGroupsPrimaryStatistics.transactionGroups.map(
          (group: any) => group.impact
        );
        expectSnapshot(impacts).toMatchInline(`
          Array [
            93.9315487787012,
            0.850246601543056,
            0.904925560144193,
            0.69948730072783,
            0.144008466274819,
            1.35206610551638,
            0.476127116253573,
            0.446552298379043,
            0.860493303928453,
            0.262800744776717,
            0.0620236424870074,
            0.00972008126772269,
          ]
        `);

        expect(Math.round(sum(impacts))).to.eql(100);

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];

        expectSnapshot(pick(firstItem, 'name', 'latency', 'throughput', 'errorRate', 'impact'))
          .toMatchInline(`
          Object {
            "errorRate": 0.0833333333333333,
            "impact": 93.9315487787012,
            "latency": 1047903,
            "name": "DispatcherServlet#doGet",
            "throughput": 0.4,
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
        expectSnapshot(firstItem.latency).toMatchInline(`8224767`);
      });
    }
  );
}
