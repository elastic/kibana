/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { meanBy } from 'lodash';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getLatencyValues(processorEvent: 'transaction' | 'metric') {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };
    const [serviceInventoryAPIResponse, serviceMapsNodeDetails] = await Promise.all([
      apmApiClient.readUser({
        endpoint: 'GET /internal/apm/services',
        params: {
          query: {
            ...commonQuery,
            kuery: `service.name : "${serviceName}" and processor.event : "${processorEvent}"`,
            probability: 1,
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
        endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
        params: {
          path: { serviceName },
          query: commonQuery,
        },
      }),
    ]);

    const serviceInventoryLatency = serviceInventoryAPIResponse.body.items[0].latency;

    const serviceMapsNodeDetailsLatency = meanBy(
      serviceMapsNodeDetails.body.currentPeriod.transactionStats?.latency?.timeseries,
      'y'
    );

    return {
      serviceInventoryLatency,
      serviceMapsNodeDetailsLatency,
    };
  }

  let latencyMetricValues: Awaited<ReturnType<typeof getLatencyValues>>;
  let latencyTransactionValues: Awaited<ReturnType<typeof getLatencyValues>>;
  registry.when('Service Maps APIs', { config: 'trial', archives: [] }, () => {
    describe('when data is loaded ', () => {
      const GO_PROD_RATE = 80;
      const GO_DEV_RATE = 20;
      const GO_PROD_DURATION = 1000;
      const GO_DEV_DURATION = 500;
      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');
        const serviceGoDevInstance = apm
          .service({ name: serviceName, environment: 'development', agentName: 'go' })
          .instance('instance-b');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({
                  transactionName: 'GET /api/product/list',
                  transactionType: 'Worker',
                })
                .duration(GO_PROD_DURATION)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_DEV_RATE)
            .generator((timestamp) =>
              serviceGoDevInstance
                .transaction({ transactionName: 'GET /api/product/:id' })
                .duration(GO_DEV_DURATION)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      // FLAKY: https://github.com/elastic/kibana/issues/176976
      describe('compare latency value between service inventory and service maps', () => {
        before(async () => {
          [latencyTransactionValues, latencyMetricValues] = await Promise.all([
            getLatencyValues('transaction'),
            getLatencyValues('metric'),
          ]);
        });

        it('returns same avg latency value for Transaction-based and Metric-based data', () => {
          const expectedLatencyAvgValueMs = ((GO_DEV_RATE * GO_DEV_DURATION) / GO_DEV_RATE) * 1000;

          [
            latencyTransactionValues.serviceMapsNodeDetailsLatency,
            latencyTransactionValues.serviceInventoryLatency,
            latencyMetricValues.serviceMapsNodeDetailsLatency,
            latencyMetricValues.serviceInventoryLatency,
          ].forEach((value) => expect(value).to.be.equal(expectedLatencyAvgValueMs));
        });
      });
    });
  });
}
