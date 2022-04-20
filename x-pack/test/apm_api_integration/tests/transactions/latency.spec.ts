/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import moment from 'moment';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';

type LatencyChartReturnType =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';

  const { start, end } = archives_metadata[archiveName];

  registry.when(
    'Latency with a basic license when data is not loaded ',
    { config: 'basic', archives: [] },
    () => {
      it('returns 400 when latencyAggregationType is not informed', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
            query: {
              start,
              end,
              transactionType: 'request',
              environment: 'testing',
            },
          })
        );

        expect(response.status).to.be(400);
      });

      it('returns 400 when transactionType is not informed', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
            query: {
              start,
              end,
              latencyAggregationType: 'avg',
              environment: 'testing',
            },
          })
        );

        expect(response.status).to.be(400);
      });

      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
            query: {
              start,
              end,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              environment: 'testing',
              kuery: '',
            },
          })
        );

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
      let response: Awaited<ReturnType<typeof supertest.get>>;

      describe('average latency type', () => {
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'avg',
                transactionType: 'request',
                environment: 'testing',
                kuery: '',
              },
            })
          );
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).not.to.be(null);
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(31);
        });
      });

      describe('95th percentile latency type', () => {
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'p95',
                transactionType: 'request',
                environment: 'testing',
                kuery: '',
              },
            })
          );
        });

        it('returns average duration and timeseries', async () => {
          expect(response.status).to.be(200);
          const latencyChartReturn = response.body as LatencyChartReturnType;
          expect(latencyChartReturn.currentPeriod.overallAvgDuration).not.to.be(null);
          expect(latencyChartReturn.currentPeriod.latencyTimeseries.length).to.be.eql(31);
        });
      });

      describe('99th percentile latency type', () => {
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'p99',
                transactionType: 'request',
                environment: 'testing',
                kuery: '',
              },
            })
          );
        });

        it('returns average duration and timeseries', async () => {
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
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
              query: {
                latencyAggregationType: 'avg',
                transactionType: 'request',
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                offset: '15m',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            })
          );
        });

        it('returns some data', async () => {
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
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-node/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'avg',
                transactionType: 'request',
                environment: 'does-not-exist',
                kuery: '',
              },
            })
          );
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
      let response: Awaited<ReturnType<typeof supertest.get>>;

      const transactionType = 'request';

      describe('without an environment', () => {
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-java/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'avg',
                transactionType,
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            })
          );
        });

        it('returns an ok response', () => {
          expect(response.status).to.eql(200);
        });
      });

      describe('with environment selected', () => {
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-python/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'avg',
                transactionType,
                environment: 'production',
                kuery: '',
              },
            })
          );
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });
      });

      describe('with all environments selected', () => {
        before(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/internal/apm/services/opbeans-java/transactions/charts/latency`,
              query: {
                start,
                end,
                latencyAggregationType: 'avg',
                transactionType,
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            })
          );
        });

        it('should have a successful response', () => {
          expect(response.status).to.eql(200);
        });
      });
    }
  );
}
