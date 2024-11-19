/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { sum } from 'lodash';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { ApmDocumentType, ApmTransactionDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T01:00:00.000Z').getTime() - 1;

  async function callApi(overrides?: {
    path?: {
      serviceName?: string;
    };
    query?: {
      start?: string;
      end?: string;
      transactionType?: string;
      environment?: string;
      kuery?: string;
      latencyAggregationType?: LatencyAggregationType;
      documentType?: ApmTransactionDocumentType;
      rollupInterval?: RollupInterval;
      useDurationSummary?: boolean;
    };
  }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          latencyAggregationType: 'avg' as LatencyAggregationType,
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          useDurationSummary: false,
          kuery: '',
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          ...overrides?.query,
        },
      },
    });
    expect(response.status).to.be(200);
    return response.body;
  }

  registry.when(
    'Transaction groups main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const transactionsGroupsPrimaryStatistics = await callApi();

        expect(transactionsGroupsPrimaryStatistics.transactionGroups).to.empty();
        expect(transactionsGroupsPrimaryStatistics.maxCountExceeded).to.be(false);
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177620
  registry.when('when data is loaded', { config: 'basic', archives: [] }, () => {
    describe('Transaction groups main statistics', () => {
      const GO_PROD_RATE = 75;
      const GO_PROD_ERROR_RATE = 25;
      const transactions = [
        {
          name: 'GET /api/product/list',
          duration: 10,
        },
        {
          name: 'GET /api/product/list2',
          duration: 100,
        },
        {
          name: 'GET /api/product/list3',
          duration: 1000,
        },
      ];
      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .generator((timestamp) => {
              return transactions.map(({ name, duration }) => {
                return serviceGoProdInstance
                  .transaction({ transactionName: name })
                  .timestamp(timestamp)
                  .duration(duration)
                  .success();
              });
            }),
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_ERROR_RATE)
            .generator((timestamp) => {
              return transactions.map(({ name, duration }) => {
                return serviceGoProdInstance
                  .transaction({ transactionName: name })
                  .timestamp(timestamp)
                  .duration(duration)
                  .failure();
              });
            }),
        ]);
      });
      after(() => apmSynthtraceEsClient.clean());

      it('returns the correct data', async () => {
        const transactionsGroupsPrimaryStatistics = await callApi();
        const transactionsGroupsPrimaryStatisticsWithDurationSummaryTrue = await callApi({
          query: {
            useDurationSummary: true,
          },
        });

        [
          transactionsGroupsPrimaryStatistics,
          transactionsGroupsPrimaryStatisticsWithDurationSummaryTrue,
        ].forEach((statistics) => {
          expect(statistics.transactionGroups.length).to.be(3);
          expect(statistics.maxCountExceeded).to.be(false);
          expect(statistics.transactionGroups.map(({ name }) => name)).to.eql(
            transactions.map(({ name }) => name)
          );

          const impacts = statistics.transactionGroups.map((group: any) => group.impact);

          expect(Math.round(sum(impacts))).to.eql(100);

          const firstItem = statistics.transactionGroups[0];

          expect(firstItem).to.eql({
            name: 'GET /api/product/list',
            latency: 10000,
            throughput: 100.00002777778549,
            errorRate: 0.25,
            impact: 0.9009009009009009,
            transactionType: 'request',
            alertsCount: 0,
          });
        });
      });

      it('returns the correct data for latency aggregation 99th percentile', async () => {
        const transactionsGroupsPrimaryStatistics = await callApi({
          query: {
            latencyAggregationType: LatencyAggregationType.p99,
          },
        });

        const firstItem = transactionsGroupsPrimaryStatistics.transactionGroups[0];
        expect(firstItem.latency).to.be(10000);
      });
    });
  });
}
