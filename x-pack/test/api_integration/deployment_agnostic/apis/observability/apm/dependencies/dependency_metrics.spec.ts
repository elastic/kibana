/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { sum } from 'lodash';
import { isFiniteNumber } from '@kbn/apm-plugin/common/utils/is_finite_number';
import { Coordinate } from '@kbn/apm-plugin/typings/timeseries';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { SupertestReturnType } from '../../../../services/apm_api';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { roundNumber } from '../utils/common';
import { generateOperationData, generateOperationDataConfig } from './generate_operation_data';

const {
  ES_BULK_DURATION,
  ES_BULK_RATE,
  ES_SEARCH_DURATION,
  ES_SEARCH_FAILURE_RATE,
  ES_SEARCH_SUCCESS_RATE,
  ES_SEARCH_UNKNOWN_RATE,
  REDIS_SET_RATE,
} = generateOperationDataConfig;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi<TMetricName extends 'latency' | 'throughput' | 'error_rate'>({
    dependencyName,
    searchServiceDestinationMetrics,
    spanName = '',
    metric,
    kuery = '',
    environment = ENVIRONMENT_ALL.value,
  }: {
    dependencyName: string;
    searchServiceDestinationMetrics: boolean;
    spanName?: string;
    metric: TMetricName;
    kuery?: string;
    environment?: string;
  }): Promise<SupertestReturnType<`GET /internal/apm/dependencies/charts/${TMetricName}`>> {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/dependencies/charts/${
        metric as 'latency' | 'throughput' | 'error_rate'
      }`,
      params: {
        query: {
          dependencyName,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment,
          kuery,
          offset: '',
          spanName,
          searchServiceDestinationMetrics,
        },
      },
    });
  }

  function avg(coordinates: Coordinate[]) {
    const values = coordinates
      .filter((coord): coord is { x: number; y: number } => isFiniteNumber(coord.y))
      .map((coord) => coord.y);

    return roundNumber(sum(values) / values.length);
  }

  describe('Dependency metrics', () => {
    describe('when data is not loaded', () => {
      it('handles empty state', async () => {
        const { body, status } = await callApi({
          dependencyName: 'elasticsearch',
          metric: 'latency',
          searchServiceDestinationMetrics: true,
        });

        expect(status).to.be(200);
        expect(body.currentTimeseries.filter((val) => isFiniteNumber(val.y))).to.empty();
        expect(
          (body.comparisonTimeseries || [])?.filter((val) => isFiniteNumber(val.y))
        ).to.empty();
      });
    });

    describe('when data is loaded', () => {
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await generateOperationData({
          apmSynthtraceEsClient,
          start,
          end,
        });
      });

      describe('without spanName', () => {
        describe('without a kuery or environment', () => {
          it('returns the correct latency', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'latency',
            });

            const searchRate =
              ES_SEARCH_FAILURE_RATE + ES_SEARCH_SUCCESS_RATE + ES_SEARCH_UNKNOWN_RATE;
            const bulkRate = ES_BULK_RATE;

            expect(avg(response.body.currentTimeseries)).to.eql(
              roundNumber(
                ((ES_SEARCH_DURATION * searchRate + ES_BULK_DURATION * bulkRate) /
                  (searchRate + bulkRate)) *
                  1000
              )
            );
          });

          it('returns the correct throughput', async () => {
            const response = await callApi({
              dependencyName: 'redis',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'throughput',
            });

            expect(avg(response.body.currentTimeseries)).to.eql(REDIS_SET_RATE);
          });

          it('returns the correct failure rate', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'error_rate',
            });

            const expectedErrorRate =
              ES_SEARCH_FAILURE_RATE / (ES_SEARCH_FAILURE_RATE + ES_SEARCH_SUCCESS_RATE);

            expect(avg(response.body.currentTimeseries)).to.eql(expectedErrorRate);
          });
        });

        describe('with a kuery', () => {
          it('returns the correct latency', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'latency',
              kuery: `event.outcome:unknown`,
            });

            const searchRate = ES_SEARCH_UNKNOWN_RATE;
            const bulkRate = ES_BULK_RATE;

            expect(avg(response.body.currentTimeseries)).to.eql(
              roundNumber(
                ((ES_SEARCH_DURATION * searchRate + ES_BULK_DURATION * bulkRate) /
                  (searchRate + bulkRate)) *
                  1000
              )
            );
          });

          it('returns the correct throughput', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'throughput',
              kuery: `event.outcome:unknown`,
            });

            const searchRate = ES_SEARCH_UNKNOWN_RATE;
            const bulkRate = ES_BULK_RATE;

            expect(avg(response.body.currentTimeseries)).to.eql(roundNumber(searchRate + bulkRate));
          });

          it('returns the correct failure rate', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'error_rate',
              kuery: 'event.outcome:success',
            });

            expect(avg(response.body.currentTimeseries)).to.eql(0);
          });
        });

        describe('with an environment', () => {
          it('returns the correct latency', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'latency',
              environment: 'production',
            });

            const searchRate = ES_SEARCH_UNKNOWN_RATE;
            const bulkRate = 0;

            expect(avg(response.body.currentTimeseries)).to.eql(
              roundNumber(
                ((ES_SEARCH_DURATION * searchRate + ES_BULK_DURATION * bulkRate) /
                  (searchRate + bulkRate)) *
                  1000
              )
            );
          });

          it('returns the correct throughput', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'throughput',
              environment: 'production',
            });

            const searchRate =
              ES_SEARCH_FAILURE_RATE + ES_SEARCH_SUCCESS_RATE + ES_SEARCH_UNKNOWN_RATE;
            const bulkRate = 0;

            expect(avg(response.body.currentTimeseries)).to.eql(roundNumber(searchRate + bulkRate));
          });

          it('returns the correct failure rate', async () => {
            const response = await callApi({
              dependencyName: 'elasticsearch',
              searchServiceDestinationMetrics: true,
              spanName: '',
              metric: 'error_rate',
              environment: 'development',
            });

            expect(avg(response.body.currentTimeseries)).to.eql(null);
          });
        });
      });

      describe('with spanName', () => {
        it('returns the correct latency', async () => {
          const response = await callApi({
            dependencyName: 'elasticsearch',
            searchServiceDestinationMetrics: false,
            spanName: '/_search',
            metric: 'latency',
          });

          const searchRate =
            ES_SEARCH_FAILURE_RATE + ES_SEARCH_SUCCESS_RATE + ES_SEARCH_UNKNOWN_RATE;
          const bulkRate = 0;

          expect(avg(response.body.currentTimeseries)).to.eql(
            roundNumber(
              ((ES_SEARCH_DURATION * searchRate + ES_BULK_DURATION * bulkRate) /
                (searchRate + bulkRate)) *
                1000
            )
          );
        });

        it('returns the correct throughput', async () => {
          const response = await callApi({
            dependencyName: 'redis',
            searchServiceDestinationMetrics: false,
            spanName: 'SET',
            metric: 'throughput',
          });

          expect(avg(response.body.currentTimeseries)).to.eql(REDIS_SET_RATE);
        });

        it('returns the correct failure rate', async () => {
          const response = await callApi({
            dependencyName: 'elasticsearch',
            searchServiceDestinationMetrics: false,
            spanName: '/_bulk',
            metric: 'error_rate',
          });

          expect(avg(response.body.currentTimeseries)).to.eql(null);
        });
      });

      after(() => apmSynthtraceEsClient.clean());
    });
  });
}
