/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-generator';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const traceData = getService('traceData');

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
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
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
      // TODO: not using it for now since the instance name is empty for metric documents
      // apmApiClient.readUser({
      //   endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics`,
      //   params: {
      //     path: { serviceName },
      //     query: {
      //       ...commonQuery,
      //       numBuckets: 20,
      //       kuery: `processor.event : "${processorEvent}"`,
      //       transactionType: 'request',
      //       latencyAggregationType: 'avg' as LatencyAggregationType,
      //       serviceNodeIds: JSON.stringify(['instance-a', 'instance-b']),
      //     },
      //   },
      // }),
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

    // TODO: not using it for now since the instance name is empty for metric documents
    // const serviceInstancesDetailedThroughputSum = sum(
    //   Object.values(serviceInstancesDetailedAPIResponse.body.currentPeriod).map(({ throughput }) =>
    //     meanBy(throughput, 'y')
    //   )
    // );

    return {
      serviceInventoryThroughput,
      throughputChartApiMean,
      transactionsGroupThroughputSum,
      serviceInstancesThroughputSum,
    };
  }

  let throughputMetricValues: PromiseReturnType<typeof getThroughputValues>;
  let throughputTransactionValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when('Services APIs', { config: 'basic', archives: ['apm_8.0.0_empty'] }, () => {
    describe('when data is loaded ', () => {
      before(async () => {
        const GO_PROD_RATE = 10;
        const GO_DEV_RATE = 5;
        const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
          'instance-a'
        );
        const serviceGoDevInstance = service(serviceName, 'development', 'go').instance(
          'instance-b'
        );
        await traceData.index([
          ...timerange(start, end)
            .interval('1s')
            .rate(GO_PROD_RATE)
            .flatMap((timestamp) =>
              serviceGoProdInstance
                .transaction('GET /api/product/list')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
          ...timerange(start, end)
            .interval('1s')
            .rate(GO_DEV_RATE)
            .flatMap((timestamp) =>
              serviceGoDevInstance
                .transaction('GET /api/product/:id')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
        ]);
      });

      after(() => traceData.clean());

      describe('compare throughput value between service inventory, throughput chart, service inventory and transactions apis', () => {
        before(async () => {
          [throughputTransactionValues, throughputMetricValues] = await Promise.all([
            getThroughputValues('transaction'),
            getThroughputValues('metric'),
          ]);
        });

        describe('Transaction-based throughput', () => {
          it('returns same throughput value', () => {
            Object.values(throughputTransactionValues).every(
              (value) => roundNumber(value) === '900.0'
            );
          });
        });

        describe('Metric-based throughput', () => {
          it('returns same throughput value', () => {
            Object.values(throughputMetricValues).every((value) => roundNumber(value) === '900.0');
          });
        });

        describe('Compare Transaction-based and Metric-based throughput', () => {
          it('returns same throughput value on service inventory api', () => {
            expect(roundNumber(throughputMetricValues.serviceInventoryThroughput)).to.be(
              roundNumber(throughputTransactionValues.serviceInventoryThroughput)
            );
          });

          it('returns same throughput value on throughput chart api', () => {
            expect(roundNumber(throughputMetricValues.throughputChartApiMean)).to.be(
              roundNumber(throughputTransactionValues.throughputChartApiMean)
            );
          });

          it('returns same throughput value on transactions group api', () => {
            expect(roundNumber(throughputMetricValues.transactionsGroupThroughputSum)).to.be(
              roundNumber(throughputTransactionValues.transactionsGroupThroughputSum)
            );
          });

          it('returns same throughput value on service instances api', () => {
            expect(roundNumber(throughputMetricValues.serviceInstancesThroughputSum)).to.be(
              roundNumber(throughputTransactionValues.serviceInstancesThroughputSum)
            );
          });

          // TODO: not using it for now since the instance name is empty for metric documents
          // it('returns same throughput value on service instances detailed api', () => {
          //   expect(roundNumber(throughputMetricValues.serviceInstancesDetailedThroughputSum)).to.be(
          //     roundNumber(throughputTransactionValues.serviceInstancesDetailedThroughputSum)
          //   );
          // });
        });
      });
    });
  });
}
