/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { BackendNode } from '../../../../plugins/apm/common/connections';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

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
      transactionsDetailsAPIResponse,
      serviceDependencyAPIResponse,
      topBackendsAPIResponse,
      backendThroughputChartAPIResponse,
    ] = await Promise.all([
      apmApiSupertest({
        endpoint: 'GET /api/apm/services',
        params: {
          query: {
            ...commonQuery,
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
          },
        },
      }),
      apmApiSupertest({
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
      apmApiSupertest({
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
      apmApiSupertest({
        endpoint: `GET /api/apm/services/{serviceName}/dependencies`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            numBuckets: 20,
            offset: '1d',
          },
        },
      }),
      apmApiSupertest({
        endpoint: `GET /api/apm/backends/top_backends`,
        params: {
          query: {
            ...commonQuery,
            numBuckets: 20,
            kuery: '',
          },
        },
      }),
      apmApiSupertest({
        endpoint: `GET /api/apm/backends/{backendName}/charts/throughput`,
        params: {
          path: { backendName: 'elasticsearch' },
          query: {
            ...commonQuery,
            kuery: '',
          },
        },
      }),
    ]);
    const serviceInventoryThroughput = serviceInventoryAPIResponse.body.items[0].throughput;

    const throughputChartApiMean = meanBy(serviceThroughputAPIResponse.body.currentPeriod, 'y');

    const transactionsThroughputSum = sumBy(
      transactionsDetailsAPIResponse.body.transactionGroups,
      'throughput'
    );

    const backendThroughputChartMean = meanBy(
      backendThroughputChartAPIResponse.body.currentTimeseries,
      'y'
    );

    return {
      serviceInventoryThroughput,
      throughputChartApiMean,
      transactionsThroughputSum,
      serviceDependencies: serviceDependencyAPIResponse.body.serviceDependencies.map((item) => ({
        backendName: (item.location as BackendNode).backendName,
        throughputValue: item.currentStats.throughput.value,
      })),
      topDependencies: topBackendsAPIResponse.body.backends.map((item) => ({
        backendName: (item.location as BackendNode).backendName,
        throughputValue: item.currentStats.throughput.value,
      })),
      backendThroughputChartMean,
    };
  }

  let throughputMetricValues: PromiseReturnType<typeof getThroughputValues>;
  let throughputTransactionValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when('Throughput value', { config: 'basic', archives: [archiveName] }, () => {
    describe('compare throughput value across different APIs', () => {
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

      describe('compare throughput value between service inventory, throughput chart and transactions apis', () => {
        it('matches transactions throughput values', () => {
          const {
            serviceInventoryThroughput,
            throughputChartApiMean,
            transactionsThroughputSum,
          } = throughputTransactionValues;
          expect(roundNumber(serviceInventoryThroughput)).to.be(
            roundNumber(throughputChartApiMean)
          );
          expect(roundNumber(serviceInventoryThroughput)).to.be(
            roundNumber(transactionsThroughputSum)
          );
        });
        it('matches metrics throughput values', () => {
          const {
            serviceInventoryThroughput,
            throughputChartApiMean,
            transactionsThroughputSum,
          } = throughputMetricValues;
          expect(roundNumber(serviceInventoryThroughput)).to.be(
            roundNumber(throughputChartApiMean)
          );
          expect(roundNumber(serviceInventoryThroughput)).to.be(
            roundNumber(transactionsThroughputSum)
          );
        });
        it('has same throughput value for metrics and transactions data', () => {
          expect(roundNumber(throughputMetricValues.serviceInventoryThroughput)).to.be(
            roundNumber(throughputTransactionValues.serviceInventoryThroughput)
          );
          expect(roundNumber(throughputMetricValues.throughputChartApiMean)).to.be(
            roundNumber(throughputTransactionValues.throughputChartApiMean)
          );
          expect(roundNumber(throughputMetricValues.transactionsThroughputSum)).to.be(
            roundNumber(throughputTransactionValues.transactionsThroughputSum)
          );
        });
      });

      describe('compare throughput value between service dependencies and top backends', () => {
        it('matches transactions throughput values', () => {
          const { topDependencies, serviceDependencies } = throughputTransactionValues;
          expect(serviceDependencies).to.eql(topDependencies);
        });
        it('matches metrics throughput values', () => {
          const { topDependencies, serviceDependencies } = throughputMetricValues;
          expect(serviceDependencies).to.eql(topDependencies);
        });
        it('has same throughput value for metrics and transactions data', () => {
          expect(throughputTransactionValues.serviceDependencies).to.eql(
            throughputMetricValues.serviceDependencies
          );
          expect(throughputTransactionValues.topDependencies).to.eql(
            throughputMetricValues.topDependencies
          );
        });
      });
    });
  });
}
