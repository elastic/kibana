/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';

type LatencyChartReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';

  const { start, end } = archives_metadata[archiveName];

  async function fetchLatencyCharts({
    serviceName,
    query,
  }: {
    serviceName: string;
    query: {
      start: string;
      end: string;
      latencyAggregationType: LatencyAggregationType;
      transactionType: string;
      environment: string;
      kuery: string;
      offset?: string;
    };
  }) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/transactions/charts/latency`,
      params: {
        path: { serviceName },
        query,
      },
    });
  }

  registry.when(
    'Latency with a basic license when data is not loaded ',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await fetchLatencyCharts({
          serviceName: 'opbeans-node',
          query: {
            start,
            end,
            latencyAggregationType: LatencyAggregationType.avg,
            transactionType: 'request',
            environment: 'testing',
            kuery: '',
          },
        });

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
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('average latency type', () => {
        it('returns average duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType: 'request',
              environment: 'testing',
              kuery: '',
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).not.to.be(null);
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(31);
        });
      });

      describe('95th percentile latency type', () => {
        it('returns average duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.p95,
              transactionType: 'request',
              environment: 'testing',
              kuery: '',
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).not.to.be(null);
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(31);
        });
      });

      describe('99th percentile latency type', () => {
        it('returns average duration and timeseries', async () => {
          const response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.p99,
              transactionType: 'request',
              environment: 'testing',
              kuery: '',
            },
          });

          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;

          expect(latencyChartReturn.currentPeriod.overallAvgDuration).not.to.be(null);
          expectSnapshot(latencyChartReturn.currentPeriod.overallAvgDuration).toMatchInline(
            `53906.6603773585`
          );

          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(31);
        });
      });

      describe('time comparison', () => {
        let response: Awaited<ReturnType<typeof fetchLatencyCharts>>;

        before(async () => {
          response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType: 'request',
              start: moment(end).subtract(15, 'minutes').toISOString(),
              end,
              offset: '15m',
              environment: 'ENVIRONMENT_ALL',
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

          expectSnapshot(currentPeriodNonNullDataPoints).toMatch();
          expectSnapshot(previousPeriodNonNullDataPoints).toMatch();
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
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType: 'request',
              environment: 'does-not-exist',
              kuery: '',
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
    }
  );

  registry.when(
    'Transaction latency with a trial license when data is loaded',
    { config: 'trial', archives: [archiveName] },
    () => {
      let response: Awaited<ReturnType<typeof fetchLatencyCharts>>;

      const transactionType = 'request';

      describe('without an environment', () => {
        before(async () => {
          response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          });
        });

        it('returns an ok response', () => {
          expect(response.status).to.eql(200);
        });
      });

      describe('with environment selected', () => {
        before(async () => {
          response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType,
              environment: 'production',
              kuery: '',
            },
          });
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });
      });

      describe('with all environments selected', () => {
        before(async () => {
          response = await fetchLatencyCharts({
            serviceName: 'opbeans-node',
            query: {
              start,
              end,
              latencyAggregationType: LatencyAggregationType.avg,
              transactionType,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          });
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });
      });
    }
  );
}
