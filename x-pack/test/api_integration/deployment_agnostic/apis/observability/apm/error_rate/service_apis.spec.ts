/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { mean, meanBy, sumBy } from 'lodash';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { isFiniteNumber } from '@kbn/apm-plugin/common/utils/is_finite_number';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

const GO_PROD_LIST_RATE = 75;
const GO_PROD_LIST_ERROR_RATE = 25;
const GO_PROD_ID_RATE = 50;
const GO_PROD_ID_ERROR_RATE = 50;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getErrorRateValues({
    processorEvent,
  }: {
    processorEvent: 'transaction' | 'metric';
  }) {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };

    const [
      serviceInventoryAPIResponse,
      transactionsErrorRateChartAPIResponse,
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
                  useDurationSummary: true,
                }
              : {
                  documentType: ApmDocumentType.TransactionEvent,
                  rollupInterval: RollupInterval.None,
                  useDurationSummary: false,
                }),
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
            bucketSizeInSeconds: 60,
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
        endpoint: `GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
            latencyAggregationType: 'avg' as LatencyAggregationType,
            useDurationSummary: false,
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
        endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            transactionType: 'request',
            latencyAggregationType: 'avg' as LatencyAggregationType,
            sortField: 'throughput',
            sortDirection: 'desc',
          },
        },
      }),
    ]);

    const serviceInventoryErrorRate =
      serviceInventoryAPIResponse.body.items[0].transactionErrorRate;

    const errorRateChartApiMean = meanBy(
      transactionsErrorRateChartAPIResponse.body.currentPeriod.timeseries.filter(
        (item) => isFiniteNumber(item.y) && item.y > 0
      ),
      'y'
    );

    const transactionsGroupErrorRateSum = sumBy(
      transactionsGroupDetailsAPIResponse.body.transactionGroups,
      'errorRate'
    );

    const serviceInstancesErrorRateSum = sumBy(
      serviceInstancesAPIResponse.body.currentPeriod,
      'errorRate'
    );

    return {
      serviceInventoryErrorRate,
      errorRateChartApiMean,
      transactionsGroupErrorRateSum,
      serviceInstancesErrorRateSum,
    };
  }

  let errorRateMetricValues: Awaited<ReturnType<typeof getErrorRateValues>>;
  let errorTransactionValues: Awaited<ReturnType<typeof getErrorRateValues>>;

  describe('Services APIs', () => {
    describe('when data is loaded ', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');

        const transactionNameProductList = 'GET /api/product/list';
        const transactionNameProductId = 'GET /api/product/:id';

        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_LIST_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: transactionNameProductList })
                .timestamp(timestamp)
                .duration(1000)
                .success()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_LIST_ERROR_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: transactionNameProductList })
                .duration(1000)
                .timestamp(timestamp)
                .failure()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_ID_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: transactionNameProductId })
                .timestamp(timestamp)
                .duration(1000)
                .success()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_ID_ERROR_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: transactionNameProductId })
                .duration(1000)
                .timestamp(timestamp)
                .failure()
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('compare error rate value between service inventory, error rate chart, service inventory and transactions apis', () => {
        before(async () => {
          [errorTransactionValues, errorRateMetricValues] = await Promise.all([
            getErrorRateValues({ processorEvent: 'transaction' }),
            getErrorRateValues({ processorEvent: 'metric' }),
          ]);
        });

        it('returns same avg error rate value for Transaction-based and Metric-based data', () => {
          [
            errorTransactionValues.serviceInventoryErrorRate,
            errorTransactionValues.errorRateChartApiMean,
            errorTransactionValues.serviceInstancesErrorRateSum,
            errorRateMetricValues.serviceInventoryErrorRate,
            errorRateMetricValues.errorRateChartApiMean,
            errorRateMetricValues.serviceInstancesErrorRateSum,
          ].forEach((value) =>
            expect(value).to.be.equal(mean([GO_PROD_LIST_ERROR_RATE, GO_PROD_ID_ERROR_RATE]) / 100)
          );
        });

        it('returns same sum error rate value for Transaction-based and Metric-based data', () => {
          [
            errorTransactionValues.transactionsGroupErrorRateSum,
            errorRateMetricValues.transactionsGroupErrorRateSum,
          ].forEach((value) =>
            expect(value).to.be.equal((GO_PROD_LIST_ERROR_RATE + GO_PROD_ID_ERROR_RATE) / 100)
          );
        });
      });
    });
  });
}
