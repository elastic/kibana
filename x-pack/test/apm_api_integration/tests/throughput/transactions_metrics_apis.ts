/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_synthetic_8.0.0';
  const metadata = archives_metadata[archiveName];

  async function getThroughputValues({
    processorEvent,
    serviceName,
  }: {
    processorEvent: 'transaction' | 'metric';
    serviceName: string;
  }) {
    const commonQuery = {
      start: metadata.start,
      end: metadata.end,
      environment: 'ENVIRONMENT_ALL',
    };
    const [
      serviceInventoryAPIResponse,
      serviceThroughputAPIResponse,
      transactionsGroupDetailsAPIResponse,
    ] = await Promise.all([
      apmApiClient.readUser({
        endpoint: 'GET /api/apm/services',
        params: {
          query: {
            ...commonQuery,
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: 'GET /api/apm/services/{serviceName}/throughput',
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
        endpoint: `GET /api/apm/services/{serviceName}/transactions/groups/main_statistics`,
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

    return {
      serviceInventoryThroughput,
      throughputChartApiMean,
      transactionsGroupThroughputSum,
    };
  }

  let throughputMetricValues: PromiseReturnType<typeof getThroughputValues>;
  let throughputTransactionValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when(
    'Transactions and Metrics Throughput value',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('compare throughput value between service inventory, throughput chart and transactions apis', () => {
        before(async () => {
          [throughputTransactionValues, throughputMetricValues] = await Promise.all([
            getThroughputValues({
              serviceName: 'opbeans-go',
              processorEvent: 'transaction',
            }),
            getThroughputValues({
              serviceName: 'opbeans-go',
              processorEvent: 'metric',
            }),
          ]);
        });

        describe('Transactions data', () => {
          it('returns same throughput value on service inventory and throughput chart', () => {
            const { serviceInventoryThroughput, throughputChartApiMean } =
              throughputTransactionValues;
            expect(roundNumber(serviceInventoryThroughput)).to.be(
              roundNumber(throughputChartApiMean)
            );
          });

          it('returns same throughput value on service inventory and transactions group', () => {
            const { serviceInventoryThroughput, transactionsGroupThroughputSum } =
              throughputTransactionValues;
            expect(roundNumber(serviceInventoryThroughput)).to.be(
              roundNumber(transactionsGroupThroughputSum)
            );
          });

          it('matches throughput values', () => {
            const {
              serviceInventoryThroughput,
              throughputChartApiMean,
              transactionsGroupThroughputSum,
            } = throughputTransactionValues;
            expectSnapshot(roundNumber(serviceInventoryThroughput)).toMatchInline(`"100.0"`);
            expectSnapshot(roundNumber(throughputChartApiMean)).toMatchInline(`"100.0"`);
            expectSnapshot(roundNumber(transactionsGroupThroughputSum)).toMatchInline(`"100.0"`);
          });
        });

        describe('Metrics data', () => {
          it('returns same throughput value on service inventory and throughput chart', () => {
            const { serviceInventoryThroughput, throughputChartApiMean } = throughputMetricValues;
            expect(roundNumber(serviceInventoryThroughput)).to.be(
              roundNumber(throughputChartApiMean)
            );
          });

          it('returns same throughput value on service inventory and transactions group', () => {
            const { serviceInventoryThroughput, transactionsGroupThroughputSum } =
              throughputMetricValues;
            expect(roundNumber(serviceInventoryThroughput)).to.be(
              roundNumber(transactionsGroupThroughputSum)
            );
          });

          it('matches throughput values', () => {
            const {
              serviceInventoryThroughput,
              throughputChartApiMean,
              transactionsGroupThroughputSum,
            } = throughputMetricValues;
            expectSnapshot(roundNumber(serviceInventoryThroughput)).toMatchInline(`"100.0"`);
            expectSnapshot(roundNumber(throughputChartApiMean)).toMatchInline(`"100.0"`);
            expectSnapshot(roundNumber(transactionsGroupThroughputSum)).toMatchInline(`"100.0"`);
          });
        });

        describe('Compare transactions and metrics data', () => {
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
        });
      });
    }
  );
}
