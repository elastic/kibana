/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick, range as lodashRange, sum } from 'lodash';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';

type TransactionsGroupsPrimaryStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('synthtraceEsClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Transaction groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        const transctionsGroupsPrimaryStatistics =
          response.body as TransactionsGroupsPrimaryStatistics;
        expect(transctionsGroupsPrimaryStatistics.transactionGroups).to.empty();
        expect(transctionsGroupsPrimaryStatistics.maxTransactionGroupsExceeded).to.be(false);
      });
    }
  );

  registry.when(
    'Transaction groups main statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

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
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.p99,
              transactionType: 'request',
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);

        const transctionsGroupsPrimaryStatistics =
          response.body as TransactionsGroupsPrimaryStatistics;

        const firstItem = transctionsGroupsPrimaryStatistics.transactionGroups[0];
        expectSnapshot(firstItem.latency).toMatchInline(`66846719`);
      });
    }
  );

  registry.when(
    'Transaction groups with overflow bucket',
    { config: 'basic', archives: [] },
    () => {
      const range = timerange(new Date(start).getTime(), new Date(end).getTime());
      const interval = range.interval('1m');
      const TRANSACTION_TYPES = ['request'];
      const ENVIRONMENTS = ['production', 'development'];

      const OVERFLOW_BUCKET_NAME = '_other';

      const NUMBER_OF_SERVICES = 10;
      const NUMBER_OF_TRANSACTIONS = 10;

      const instances = lodashRange(0, NUMBER_OF_SERVICES)
        .map((groupId) => `service-${groupId}`)
        .flatMap((serviceName) => {
          const services = ENVIRONMENTS.map((env) =>
            apm.service({
              name: serviceName,
              environment: env,
              agentName: 'go',
            })
          );

          return lodashRange(0, 2).flatMap((serviceNodeId) =>
            services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
          );
        });

      const transactionGroupRange = lodashRange(0, NUMBER_OF_TRANSACTIONS).map(
        (groupId) => `transaction-${groupId}`
      );

      before(async () => {
        return synthtrace.index(
          [
            interval.rate(1).generator((timestamp, timestampIndex) =>
              instances.flatMap((instance) =>
                transactionGroupRange.flatMap((groupId, groupIndex) => {
                  return instance
                    .transaction(groupId, TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length])
                    .timestamp(timestamp)
                    .duration(1000)
                    .success();
                })
              )
            ),
          ],
          {
            maxTransactionOverflowCount: 2,
          }
        );
      });

      after(() => {
        return synthtrace.clean();
      });

      describe('when overflow bucket is present', () => {
        let response: {
          status: number;
          body: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;
        };

        before(async () => {
          response = await apmApiClient.readUser({
            endpoint:
              'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
            params: {
              path: { serviceName: 'service-0' },
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                transactionType: 'request',
                latencyAggregationType: 'avg' as LatencyAggregationType,
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
        });

        it('returns a successful response', () => {
          expect(response.status).to.be(200);
        });

        it('should have transaction named _other', () => {
          const serviceNamesList = response.body.transactionGroups.map((item) => item.name);
          expect(serviceNamesList.includes(OVERFLOW_BUCKET_NAME)).to.be(true);
        });

        it('should have the correct value for transactionOverflowCount', function () {
          expect(response.body.transactionOverflowCount).to.be(1160);
        });
      });
    }
  );
}
