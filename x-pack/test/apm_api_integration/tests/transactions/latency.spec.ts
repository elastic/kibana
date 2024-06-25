/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { buildQueryFromFilters } from '@kbn/es-query';
import moment from 'moment';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { meanBy } from 'lodash';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type LatencyChartReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function fetchLatencyCharts(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/transactions/charts/latency`,
      params: {
        path: { serviceName: overrides?.path?.serviceName || serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          latencyAggregationType: LatencyAggregationType.avg,
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          bucketSizeInSeconds: 60,
          useDurationSummary: false,
          ...overrides?.query,
        },
      },
    });
  }

  registry.when(
    'Latency with a basic license when data is not loaded ',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await fetchLatencyCharts();
        expect(response.status).to.be(200);
        const latencyChartReturn = response.body as LatencyChartReturnType;

        expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(null);
        expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be(0);
        expect(latencyChartReturn.previousPeriod.latencyTimeseries.length).to.be(0);
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177596
  registry.when(
    'Latency with a basic license when data is loaded',
    { config: 'basic', archives: [] },
    () => {
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
            .ratePerMinute(GO_PROD_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(GO_PROD_DURATION)
                .timestamp(timestamp)
            ),
          timerange(start, end)
            .ratePerMinute(GO_DEV_RATE)
            .generator((timestamp) =>
              serviceGoDevInstance
                .transaction({ transactionName: 'GET /api/product/:id' })
                .duration(GO_DEV_DURATION)
                .timestamp(timestamp)
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      const expectedLatencyAvgValueMs =
        ((GO_PROD_RATE * GO_PROD_DURATION + GO_DEV_RATE * GO_DEV_DURATION) /
          (GO_PROD_RATE + GO_DEV_RATE)) *
        1000;
      const expectedLatencyAvgValueProdMs =
        ((GO_PROD_RATE * GO_PROD_DURATION) / GO_PROD_RATE) * 1000;
      const expectedLatencyAvgValueDevMs = ((GO_DEV_RATE * GO_DEV_DURATION) / GO_DEV_RATE) * 1000;

      describe('average latency type', () => {
        it('returns average duration and timeseries', async () => {
          const response = await fetchLatencyCharts();

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('95th percentile latency type', () => {
        it('returns p95 duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            query: {
              latencyAggregationType: LatencyAggregationType.p95,
              useDurationSummary: false,
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('99th percentile latency type', () => {
        it('returns p99 duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            query: {
              latencyAggregationType: LatencyAggregationType.p99,
              useDurationSummary: false,
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('95th percentile latency type for service tx metrics', () => {
        it('returns p95 duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            query: {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              latencyAggregationType: LatencyAggregationType.p95,
              useDurationSummary: false,
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('99th percentile latency type for service tx metrics', () => {
        it('returns p99 duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            query: {
              documentType: ApmDocumentType.ServiceTransactionMetric,
              latencyAggregationType: LatencyAggregationType.p99,
              useDurationSummary: false,
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('time comparison', () => {
        let response: Awaited<ReturnType<typeof fetchLatencyCharts>>;

        before(async () => {
          response = await fetchLatencyCharts({
            query: {
              start: moment(end).subtract(7, 'minutes').toISOString(),
              offset: '7m',
              kuery: '',
            },
          });
        });

        it('returns some data', () => {
          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          const currentPeriodNonNullDataPoints =
            latencyChartReturn.currentPeriod.latencyTimeseries.filter(({ y }) => y !== null);
          expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
          const previousPeriodNonNullDataPoints =
            latencyChartReturn.previousPeriod.latencyTimeseries.filter(({ y }) => y !== null);
          expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);

          expect(meanBy(currentPeriodNonNullDataPoints, 'y')).to.eql(expectedLatencyAvgValueMs);
          expect(meanBy(previousPeriodNonNullDataPoints, 'y')).to.eql(expectedLatencyAvgValueMs);
        });

        it('matches x-axis on current period and previous period', () => {
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.map(({ x }) => x)).to.be.eql(
            latencyChartReturn.previousPeriod.latencyTimeseries.map(({ x }) => x)
          );
        });
      });

      describe('with a non-existing environment', () => {
        let response: Awaited<ReturnType<typeof fetchLatencyCharts>>;

        before(async () => {
          response = await fetchLatencyCharts({
            query: {
              environment: 'does-not-exist',
            },
          });
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(null);

          const currentPeriodNonNullDataPoints =
            latencyChartReturn.currentPeriod.latencyTimeseries.filter(({ y }) => y !== null);

          expect(currentPeriodNonNullDataPoints).to.be.empty();
        });
      });

      describe('with production environment', () => {
        let response: Awaited<ReturnType<typeof fetchLatencyCharts>>;

        before(async () => {
          response = await fetchLatencyCharts({
            query: {
              environment: 'production',
            },
          });
        });

        it('returns average duration and timeseries', async () => {
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            GO_PROD_DURATION * 1000
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('should return same data with duration summary true and false', () => {
        let responseWithSummaryDurationTrue: Awaited<ReturnType<typeof fetchLatencyCharts>>;
        let responseWithSummaryDurationFalse: Awaited<ReturnType<typeof fetchLatencyCharts>>;

        before(async () => {
          [responseWithSummaryDurationTrue, responseWithSummaryDurationFalse] = await Promise.all([
            fetchLatencyCharts({
              query: {
                environment: 'production',
                useDurationSummary: true,
              },
            }),
            fetchLatencyCharts({
              query: {
                environment: 'production',
                useDurationSummary: false,
              },
            }),
          ]);
        });

        it('returns average duration and timeseries', async () => {
          const latencyChartWithSummaryDurationTrueReturn =
            responseWithSummaryDurationTrue.body as LatencyChartReturnType;
          const latencyChartWithSummaryDurationFalseReturn =
            responseWithSummaryDurationFalse.body as LatencyChartReturnType;
          [
            latencyChartWithSummaryDurationTrueReturn,
            latencyChartWithSummaryDurationFalseReturn,
          ].forEach((response) => {
            expect(response.currentPeriod.overallAvgDuration).to.be(GO_PROD_DURATION * 1000);
            expect(response.currentPeriod.latencyTimeseries.length).to.be.eql(15);
          });
        });
      });

      describe('handles kuery', () => {
        it('should return the appropriate latency values when a kuery is applied', async () => {
          const response = await fetchLatencyCharts({
            query: {
              latencyAggregationType: LatencyAggregationType.p95,
              useDurationSummary: false,
              kuery: 'transaction.name : "GET /api/product/list"',
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueProdMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('handles filters', () => {
        it('should return the appropriate latency values when filters are applied', async () => {
          const filters = [
            {
              meta: {
                disabled: false,
                negate: false,
                alias: null,
                key: 'transaction.name',
                params: ['GET /api/product/list'],
                type: 'phrases',
              },
              query: {
                bool: {
                  minimum_should_match: 1,
                  should: {
                    match_phrase: {
                      'transaction.name': 'GET /api/product/list',
                    },
                  },
                },
              },
            },
          ];
          const serializedFilters = JSON.stringify(buildQueryFromFilters(filters, undefined));
          const response = await fetchLatencyCharts({
            query: {
              latencyAggregationType: LatencyAggregationType.p95,
              useDurationSummary: false,
              filters: serializedFilters,
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueProdMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });

        it('should return the appropriate latency values when negate filters are applied', async () => {
          const filters = [
            {
              meta: {
                disabled: false,
                negate: true,
                alias: null,
                key: 'transaction.name',
                params: ['GET /api/product/list'],
                type: 'phrases',
              },
              query: {
                bool: {
                  minimum_should_match: 1,
                  should: {
                    match_phrase: {
                      'transaction.name': 'GET /api/product/list',
                    },
                  },
                },
              },
            },
          ];
          const serializedFilters = JSON.stringify(buildQueryFromFilters(filters, undefined));
          const response = await fetchLatencyCharts({
            query: {
              latencyAggregationType: LatencyAggregationType.p95,
              useDurationSummary: false,
              filters: serializedFilters,
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).to.be(
            expectedLatencyAvgValueDevMs
          );
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(15);
        });
      });

      describe('handles bad filters request', () => {
        it('throws bad request error', async () => {
          try {
            await fetchLatencyCharts({
              query: { environment: 'production', filters: '{}}' },
            });
          } catch (error) {
            expect(error.res.status).to.be(400);
          }
        });
      });
    }
  );
}
