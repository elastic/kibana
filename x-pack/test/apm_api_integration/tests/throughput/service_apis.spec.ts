/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getThroughputValues(processorEvent: 'transaction' | 'metric') {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };
    const [
      serviceInventoryAPIResponse,
      serviceThroughputAPIResponse,
      transactionsGroupDetailsAPIResponse,
      serviceInstancesAPIResponse,
    ] = await Promise.all([
      apmApiClient.readUser({
        endpoint: 'GET /internal/apm/services',
        params: {
          query: {
            ...commonQuery,
            probability: 1,
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
            ...(processorEvent === ProcessorEvent.metric
              ? {
                  documentType: ApmDocumentType.TransactionMetric,
                  rollupInterval: RollupInterval.OneMinute,
                }
              : {
                  documentType: ApmDocumentType.TransactionEvent,
                  rollupInterval: RollupInterval.None,
                }),
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
            latencyAggregationType: 'avg' as LatencyAggregationType,
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
            latencyAggregationType: 'avg' as LatencyAggregationType,
          },
        },
      }),
    ]);

    const serviceInventoryThroughput = serviceInventoryAPIResponse.body.items[0].throughput;

    const throughputChartApiMean = meanBy(serviceThroughputAPIResponse.body.currentPeriod, 'y');

    const transactionsGroupThroughputSum = sumBy(
      transactionsGroupDetailsAPIResponse.body.transactionGroups,
      'throughput'
    );

    const serviceInstancesThroughputSum = sumBy(
      serviceInstancesAPIResponse.body.currentPeriod,
      'throughput'
    );

    return {
      serviceInventoryThroughput,
      throughputChartApiMean,
      transactionsGroupThroughputSum,
      serviceInstancesThroughputSum,
    };
  }

  let throughputMetricValues: Awaited<ReturnType<typeof getThroughputValues>>;
  let throughputTransactionValues: Awaited<ReturnType<typeof getThroughputValues>>;

  registry.when('Services APIs', { config: 'basic', archives: [] }, () => {
    describe('when data is loaded ', () => {
      const GO_PROD_RATE = 80;
      const GO_DEV_RATE = 20;
      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');
        const serviceGoDevInstance = apm
          .service({ name: serviceName, environment: 'development', agentName: 'go' })
          .instance('instance-b');

        await synthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(1000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_DEV_RATE)
            .generator((timestamp) =>
              serviceGoDevInstance
                .transaction({ transactionName: 'GET /api/product/:id' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      describe('compare throughput value between service inventory, throughput chart, service inventory and transactions apis', () => {
        before(async () => {
          [throughputTransactionValues, throughputMetricValues] = await Promise.all([
            getThroughputValues('transaction'),
            getThroughputValues('metric'),
          ]);
        });

        it('returns same throughput value for Transaction-based and Metric-based data', () => {
          [
            ...Object.values(throughputTransactionValues),
            ...Object.values(throughputMetricValues),
          ].forEach((value) =>
            expect(roundNumber(value)).to.be.equal(roundNumber(GO_PROD_RATE + GO_DEV_RATE))
          );
        });
      });
    });
  });
}
