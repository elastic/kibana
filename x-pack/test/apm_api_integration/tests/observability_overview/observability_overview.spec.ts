/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const intervalString = '60s';
  const bucketSize = 60;

  async function getThroughputValues() {
    const commonQuery = { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
    const [serviceInventoryAPIResponse, observabilityOverviewAPIResponse] = await Promise.all([
      apmApiClient.readUser({
        endpoint: 'GET /internal/apm/services',
        params: {
          query: {
            ...commonQuery,
            probability: 1,
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
            documentType: ApmDocumentType.TransactionMetric,
            rollupInterval: RollupInterval.OneMinute,
            useDurationSummary: true,
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/observability_overview`,
        params: {
          query: {
            ...commonQuery,
            bucketSize,
            intervalString,
          },
        },
      }),
    ]);
    const serviceInventoryThroughputSum = roundNumber(
      sumBy(serviceInventoryAPIResponse.body.items, 'throughput')
    );

    return {
      serviceInventoryCount: serviceInventoryAPIResponse.body.items.length,
      serviceInventoryThroughputSum,
      observabilityOverview: observabilityOverviewAPIResponse.body,
    };
  }

  registry.when(
    'Observability overview when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/observability_overview`,
            params: {
              query: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                bucketSize,
                intervalString,
              },
            },
          });
          expect(response.status).to.be(200);

          expect(response.body.serviceCount).to.be(0);
          expect(response.body.transactionPerMinute.timeseries.length).to.be(0);
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177497
  registry.when('data is loaded', { config: 'basic', archives: [] }, () => {
    describe('Observability overview api ', () => {
      const GO_PROD_RATE = 50;
      const GO_DEV_RATE = 5;
      const JAVA_PROD_RATE = 45;
      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');
        const serviceGoDevInstance = apm
          .service({ name: 'synth-go', environment: 'development', agentName: 'go' })
          .instance('instance-b');

        const serviceJavaInstance = apm
          .service({ name: 'synth-java', environment: 'production', agentName: 'java' })
          .instance('instance-c');

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
          timerange(start, end)
            .interval('1m')
            .rate(JAVA_PROD_RATE)
            .generator((timestamp) =>
              serviceJavaInstance
                .transaction({ transactionName: 'POST /api/product/buy' })
                .duration(1000)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => synthtraceEsClient.clean());

      describe('compare throughput values', () => {
        let throughputValues: Awaited<ReturnType<typeof getThroughputValues>>;
        before(async () => {
          throughputValues = await getThroughputValues();
        });

        it('returns same number of service as shown on service inventory API', () => {
          const { serviceInventoryCount, observabilityOverview } = throughputValues;
          [serviceInventoryCount, observabilityOverview.serviceCount].forEach((value) =>
            expect(value).to.be.equal(2)
          );
        });

        it('returns same throughput value on service inventory and obs throughput count', () => {
          const { serviceInventoryThroughputSum, observabilityOverview } = throughputValues;
          const obsThroughputCount = roundNumber(observabilityOverview.transactionPerMinute.value);
          [serviceInventoryThroughputSum, obsThroughputCount].forEach((value) =>
            expect(value).to.be.equal(roundNumber(GO_PROD_RATE + GO_DEV_RATE + JAVA_PROD_RATE))
          );
        });

        it('returns same throughput value on service inventory and obs mean throughput timeseries', () => {
          const { serviceInventoryThroughputSum, observabilityOverview } = throughputValues;
          const obsThroughputMean = roundNumber(
            meanBy(observabilityOverview.transactionPerMinute.timeseries, 'y')
          );
          [serviceInventoryThroughputSum, obsThroughputMean].forEach((value) =>
            expect(value).to.be.equal(roundNumber(GO_PROD_RATE + GO_DEV_RATE + JAVA_PROD_RATE))
          );
        });
      });
    });
  });
}
