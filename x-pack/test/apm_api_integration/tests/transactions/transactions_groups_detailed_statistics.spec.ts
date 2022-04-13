/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { first, isEmpty, last, meanBy } from 'lodash';
import moment from 'moment';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { asPercent } from '../../../../plugins/apm/common/utils/formatters';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

type TransactionsGroupsDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:59.999Z').getTime();
  const transactionNames = ['GET /api/product/list'];

  async function callApi(overrides?: {
    path?: {
      serviceName?: string;
    };
    query?: {
      start?: string;
      end?: string;
      transactionType?: string;
      environment?: string;
      kuery?: string;
      offset?: string;
      transactionNames?: string;
      latencyAggregationType?: LatencyAggregationType;
      numBuckets?: number;
    };
  }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          numBuckets: 20,
          transactionType: 'request',
          latencyAggregationType: 'avg' as LatencyAggregationType,
          transactionNames: JSON.stringify(transactionNames),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    expect(response.status).to.be(200);
    return response.body;
  }

  registry.when(
    'Transaction groups detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await callApi();
        expect(response).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );

  registry.when(
    'data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('transactions groups detailed stats', () => {
        const GO_PROD_RATE = 75;
        const GO_PROD_ERROR_RATE = 25;
        before(async () => {
          const serviceGoProdInstance = apm
            .service(serviceName, 'production', 'go')
            .instance('instance-a');

          const transactionName = 'GET /api/product/list';

          await synthtraceEsClient.index([
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_RATE)
              .spans((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionName)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
                  .serialize()
              ),
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_ERROR_RATE)
              .spans((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionName)
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
                  .serialize()
              ),
          ]);
        });

        after(() => synthtraceEsClient.clean());

        describe('without comparisons', () => {
          let transactionsStatistics: TransactionsGroupsDetailedStatistics;
          let metricsStatistics: TransactionsGroupsDetailedStatistics;
          before(async () => {
            [metricsStatistics, transactionsStatistics] = await Promise.all([
              callApi({ query: { kuery: 'processor.event : "metric"' } }),
              callApi({ query: { kuery: 'processor.event : "transaction"' } }),
            ]);
          });

          it('returns some transactions data', () => {
            expect(isEmpty(transactionsStatistics.currentPeriod)).to.be.equal(false);
          });

          it('returns some metrics data', () => {
            expect(isEmpty(metricsStatistics.currentPeriod)).to.be.equal(false);
          });

          it('has same latency mean value for metrics and transactions data', () => {
            const transactionsCurrentPeriod =
              transactionsStatistics.currentPeriod[transactionNames[0]];
            const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];
            const transactionsLatencyMean = meanBy(transactionsCurrentPeriod.latency, 'y');
            const metricsLatencyMean = meanBy(metricsCurrentPeriod.latency, 'y');
            [transactionsLatencyMean, metricsLatencyMean].forEach((value) =>
              expect(value).to.be.equal(1000000)
            );
          });

          it('has same error rate mean value for metrics and transactions data', () => {
            const transactionsCurrentPeriod =
              transactionsStatistics.currentPeriod[transactionNames[0]];
            const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];

            const transactionsErrorRateMean = meanBy(transactionsCurrentPeriod.errorRate, 'y');
            const metricsErrorRateMean = meanBy(metricsCurrentPeriod.errorRate, 'y');
            [transactionsErrorRateMean, metricsErrorRateMean].forEach((value) =>
              expect(asPercent(value, 1)).to.be.equal(`${GO_PROD_ERROR_RATE}%`)
            );
          });

          it('has same throughput mean value for metrics and transactions data', () => {
            const transactionsCurrentPeriod =
              transactionsStatistics.currentPeriod[transactionNames[0]];
            const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];
            const transactionsThroughputMean = roundNumber(
              meanBy(transactionsCurrentPeriod.throughput, 'y')
            );
            const metricsThroughputMean = roundNumber(meanBy(metricsCurrentPeriod.throughput, 'y'));
            [transactionsThroughputMean, metricsThroughputMean].forEach((value) =>
              expect(value).to.be.equal(roundNumber(GO_PROD_RATE + GO_PROD_ERROR_RATE))
            );
          });

          it('has same impact value for metrics and transactions data', () => {
            const transactionsCurrentPeriod =
              transactionsStatistics.currentPeriod[transactionNames[0]];
            const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];

            const transactionsImpact = transactionsCurrentPeriod.impact;
            const metricsImpact = metricsCurrentPeriod.impact;
            [transactionsImpact, metricsImpact].forEach((value) => expect(value).to.be.equal(100));
          });
        });

        describe('with comparisons', () => {
          let transactionsStatistics: TransactionsGroupsDetailedStatistics;
          before(async () => {
            transactionsStatistics = await callApi({
              query: {
                start: moment(end).subtract(7, 'minutes').toISOString(),
                end: new Date(end).toISOString(),
                offset: '8m',
              },
            });
          });

          it('returns some data for both periods', () => {
            expect(isEmpty(transactionsStatistics.currentPeriod)).to.be.equal(false);
            expect(isEmpty(transactionsStatistics.previousPeriod)).to.be.equal(false);
          });

          it('has same start time for both periods', () => {
            const currentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
            const previousPeriod = transactionsStatistics.previousPeriod[transactionNames[0]];
            [
              [currentPeriod.latency, previousPeriod.latency],
              [currentPeriod.errorRate, previousPeriod.errorRate],
              [currentPeriod.throughput, previousPeriod.throughput],
            ].forEach(([currentTimeseries, previousTimeseries]) => {
              const firstCurrentPeriodDate = new Date(
                first(currentTimeseries)?.x ?? NaN
              ).toISOString();
              const firstPreviousPeriodDate = new Date(
                first(previousPeriod.latency)?.x ?? NaN
              ).toISOString();

              expect(firstCurrentPeriodDate).to.equal(firstPreviousPeriodDate);
            });
          });
          it('has same end time for both periods', () => {
            const currentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
            const previousPeriod = transactionsStatistics.previousPeriod[transactionNames[0]];
            [
              [currentPeriod.latency, previousPeriod.latency],
              [currentPeriod.errorRate, previousPeriod.errorRate],
              [currentPeriod.throughput, previousPeriod.throughput],
            ].forEach(([currentTimeseries, previousTimeseries]) => {
              const lastCurrentPeriodDate = new Date(
                last(currentTimeseries)?.x ?? NaN
              ).toISOString();
              const lastPreviousPeriodDate = new Date(
                last(previousPeriod.latency)?.x ?? NaN
              ).toISOString();

              expect(lastCurrentPeriodDate).to.equal(lastPreviousPeriodDate);
            });
          });

          it('returns same number of buckets for both periods', () => {
            const currentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
            const previousPeriod = transactionsStatistics.previousPeriod[transactionNames[0]];
            [
              [currentPeriod.latency, previousPeriod.latency],
              [currentPeriod.errorRate, previousPeriod.errorRate],
              [currentPeriod.throughput, previousPeriod.throughput],
            ].forEach(([currentTimeseries, previousTimeseries]) => {
              expect(currentTimeseries.length).to.equal(previousTimeseries.length);
            });
          });
        });
      });
    }
  );
}
