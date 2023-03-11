/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import moment from 'moment';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { meanBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type LatencyChartReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

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

        await synthtraceEsClient.index([
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

      after(() => synthtraceEsClient.clean());

      const expectedLatencyAvgValueMs =
        ((GO_PROD_RATE * GO_PROD_DURATION + GO_DEV_RATE * GO_DEV_DURATION) /
          (GO_PROD_RATE + GO_DEV_RATE)) *
        1000;

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
        it('returns average duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            query: { latencyAggregationType: LatencyAggregationType.p95 },
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
        it('returns average duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            query: {
              latencyAggregationType: LatencyAggregationType.p99,
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
    }
  );
}
