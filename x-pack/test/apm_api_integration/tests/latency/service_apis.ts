/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getLatencyValues({
    processorEvent,
    latencyAggregationType = LatencyAggregationType.avg,
  }: {
    processorEvent: 'transaction' | 'metric';
    latencyAggregationType?: LatencyAggregationType;
  }) {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };
    const [
      serviceInventoryAPIResponse,
      serviceLantencyAPIResponse,
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
        endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            kuery: `processor.event : "${processorEvent}"`,
            latencyAggregationType,
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

    const serviceInventoryLatency = serviceInventoryAPIResponse.body.items[0].latency;

    const latencyChartApiMean = meanBy(
      serviceLantencyAPIResponse.body.currentPeriod.latencyTimeseries.filter(
        (item) => isFiniteNumber(item.y) && item.y > 0
      ),
      'y'
    );

    const transactionsGroupLatencySum = sumBy(
      transactionsGroupDetailsAPIResponse.body.transactionGroups,
      'latency'
    );

    const serviceInstancesLatencySum = sumBy(
      serviceInstancesAPIResponse.body.currentPeriod,
      'latency'
    );

    return {
      serviceInventoryLatency,
      latencyChartApiMean,
      transactionsGroupLatencySum,
      serviceInstancesLatencySum,
    };
  }

  let latencyMetricValues: PromiseReturnType<typeof getLatencyValues>;
  let latencyTransactionValues: PromiseReturnType<typeof getLatencyValues>;

  registry.when('Services APIs', { config: 'basic', archives: ['apm_mappings_only_8.0.0'] }, () => {
    describe('when data is loaded ', () => {
      const GO_PROD_RATE = 80;
      const GO_DEV_RATE = 20;
      const GO_PROD_DURATION = 1000;
      const GO_DEV_DURATION = 500;
      before(async () => {
        const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
          'instance-a'
        );
        const serviceGoDevInstance = service(serviceName, 'development', 'go').instance(
          'instance-b'
        );
        await synthtraceEsClient.index([
          ...timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .flatMap((timestamp) =>
              serviceGoProdInstance
                .transaction('GET /api/product/list')
                .duration(GO_PROD_DURATION)
                .timestamp(timestamp)
                .serialize()
            ),
          ...timerange(start, end)
            .interval('1m')
            .rate(GO_DEV_RATE)
            .flatMap((timestamp) =>
              serviceGoDevInstance
                .transaction('GET /api/product/:id')
                .duration(GO_DEV_DURATION)
                .timestamp(timestamp)
                .serialize()
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      describe('compare latency value between service inventory, latency chart, service inventory and transactions apis', () => {
        before(async () => {
          [latencyTransactionValues, latencyMetricValues] = await Promise.all([
            getLatencyValues({ processorEvent: 'transaction' }),
            getLatencyValues({ processorEvent: 'metric' }),
          ]);
        });

        it('returns same avg latency value for Transaction-based and Metric-based data', () => {
          const expectedLatencyAvgValueMs =
            ((GO_PROD_RATE * GO_PROD_DURATION + GO_DEV_RATE * GO_DEV_DURATION) /
              (GO_PROD_RATE + GO_DEV_RATE)) *
            1000;
          [
            latencyTransactionValues.latencyChartApiMean,
            latencyTransactionValues.serviceInventoryLatency,
            latencyMetricValues.latencyChartApiMean,
            latencyMetricValues.serviceInventoryLatency,
          ].forEach((value) => expect(value).to.be.equal(expectedLatencyAvgValueMs));
        });

        it('returns same sum latency value for Transaction-based and Metric-based data', () => {
          const expectedLatencySumValueMs = (GO_PROD_DURATION + GO_DEV_DURATION) * 1000;
          [
            latencyTransactionValues.transactionsGroupLatencySum,
            latencyTransactionValues.serviceInstancesLatencySum,
            latencyMetricValues.transactionsGroupLatencySum,
            latencyMetricValues.serviceInstancesLatencySum,
          ].forEach((value) => expect(value).to.be.equal(expectedLatencySumValueMs));
        });
      });
    });
  });
}
