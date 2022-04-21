/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick, sum } from 'lodash';
import url from 'url';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';

type TransactionsGroupsPrimaryStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Transaction groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/internal/apm/services/opbeans-java/transactions/groups/main_statistics`,
            query: {
              start,
              end,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          })
        );

        expect(response.status).to.be(200);
        const transctionsGroupsPrimaryStatistics =
          response.body as TransactionsGroupsPrimaryStatistics;
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
            pathname: `/internal/apm/services/opbeans-java/transactions/groups/main_statistics`,
            query: {
              start,
              end,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          })
        );

        expect(response.status).to.be(200);

        const transctionsGroupsPrimaryStatistics =
          response.body as TransactionsGroupsPrimaryStatistics;

        expectSnapshot(
          transctionsGroupsPrimaryStatistics.transactionGroups.map((group: any) => group.name)
        ).toMatchInline(`
          Array [
            "DispatcherServlet#doGet",
            "ResourceHttpRequestHandler",
            "APIRestController#topProducts",
            "APIRestController#customer",
            "APIRestController#order",
            "APIRestController#stats",
            "APIRestController#customerWhoBought",
            "APIRestController#product",
            "APIRestController#orders",
            "APIRestController#products",
            "APIRestController#customers",
            "DispatcherServlet#doPost",
          ]
        `);

        const impacts = transctionsGroupsPrimaryStatistics.transactionGroups.map(
          (group: any) => group.impact
        );
        expectSnapshot(impacts).toMatchInline(`
          Array [
            98.4867713293593,
            0.0910992862692518,
            0.217172932411727,
            0.197499651612207,
            0.117088451625813,
            0.203168003440319,
            0.0956764857936742,
            0.353287132108131,
            0.043688393280619,
            0.0754467823979389,
            0.115710953190738,
            0.00339059851027124,
          ]
        `);

        expect(Math.round(sum(impacts))).to.eql(100);

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];

        expectSnapshot(pick(firstItem, 'name', 'latency', 'throughput', 'errorRate', 'impact'))
          .toMatchInline(`
          Object {
            "errorRate": 0.08,
            "impact": 98.4867713293593,
            "latency": 1816019.48,
            "name": "DispatcherServlet#doGet",
            "throughput": 1.66666666666667,
          }
        `);
      });

      it('returns the correct data for latency aggregation 99th percentile', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/internal/apm/services/opbeans-java/transactions/groups/main_statistics`,
            query: {
              start,
              end,
              transactionType: 'request',
              latencyAggregationType: 'p99',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          })
        );

        expect(response.status).to.be(200);

        const transctionsGroupsPrimaryStatistics =
          response.body as TransactionsGroupsPrimaryStatistics;

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];
        expectSnapshot(firstItem.latency).toMatchInline(`66846719`);
      });
    }
  );
}
