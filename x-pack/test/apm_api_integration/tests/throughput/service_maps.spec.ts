/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
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

  const commonQuery = {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    environment: 'ENVIRONMENT_ALL',
  };

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/service-map/service/{serviceName}`,
      params: {
        path: { serviceName },
        query: commonQuery,
      },
    });
  }

  async function getThroughputValues(processorEvent: 'transaction' | 'metric') {
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

    const serviceInventoryThroughput = serviceInventoryAPIResponse.body.items[0].throughput;

    const serviceMapsNodeDetailsThroughput =
      serviceMapsNodeDetails.body.currentPeriod.transactionStats?.throughput?.value;

    return {
      serviceInventoryThroughput,
      serviceMapsNodeDetailsThroughput,
    };
  }

  let throughputMetricValues: Awaited<ReturnType<typeof getThroughputValues>>;
  let throughputTransactionValues: Awaited<ReturnType<typeof getThroughputValues>>;

  registry.when('Service Maps APIs', { config: 'trial', archives: [] }, () => {
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
                .transaction({ transactionName: 'GET /apple 🍎 ', transactionType: 'Worker' })
                .duration(1000)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_DEV_RATE)
            .generator((timestamp) =>
              serviceGoDevInstance
                .transaction({ transactionName: 'GET /apple 🍎 ' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      // FLAKY: https://github.com/elastic/kibana/issues/176984
      describe('compare throughput value between service inventory and service maps', () => {
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
          ].forEach((value) => expect(roundNumber(value)).to.be.equal(GO_DEV_RATE));
        });
      });

      // FLAKY: https://github.com/elastic/kibana/issues/176987
      describe('when calling service maps transactions stats api', () => {
        let serviceMapsNodeThroughput: number | null | undefined;
        before(async () => {
          const response = await callApi();
          serviceMapsNodeThroughput =
            response.body.currentPeriod.transactionStats?.throughput?.value;
        });

        it('returns expected throughput value', () => {
          expect(roundNumber(serviceMapsNodeThroughput)).to.be.equal(GO_DEV_RATE);
        });
      });
    });
  });
}
