/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { first, isEmpty, last, meanBy } from 'lodash';
import moment from 'moment';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ApmDocumentType, ApmTransactionDocumentType } from '@kbn/apm-plugin/common/document_type';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { roundNumber } from '../../../../../../apm_api_integration/utils';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

type TransactionsGroupsDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T01:00:00.000Z').getTime() - 1;
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
      bucketSizeInSeconds?: number;
      documentType?: ApmTransactionDocumentType;
      rollupInterval?: RollupInterval;
      useDurationSummary?: boolean;
    };
  }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
      params: {
        path: { serviceName, ...overrides?.path },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          bucketSizeInSeconds: 60,
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          transactionType: 'test',
          useDurationSummary: false,
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

  describe('Transactions groups detailed statistics', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await callApi();
        expect(response).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    });

    describe('when data is loaded', () => {
      const GO_PROD_RATE = 75;
      const GO_PROD_ERROR_RATE = 25;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');

        const transactionName = 'GET /api/product/list';

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName, transactionType: 'test' })
                .timestamp(timestamp)
                .duration(1000)
                .success()
            ),
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_ERROR_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName, transactionType: 'test' })
                .duration(1000)
                .timestamp(timestamp)
                .failure()
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('without comparisons', () => {
        let transactionsStatistics: TransactionsGroupsDetailedStatistics;
        let metricsStatisticsOneMinute: TransactionsGroupsDetailedStatistics;
        let metricsStatisticsTenMinute: TransactionsGroupsDetailedStatistics;
        let metricsStatisticsSixtyMinute: TransactionsGroupsDetailedStatistics;
        before(async () => {
          [
            metricsStatisticsOneMinute,
            metricsStatisticsTenMinute,
            metricsStatisticsSixtyMinute,
            transactionsStatistics,
          ] = await Promise.all([
            callApi({
              query: {
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.OneMinute,
              },
            }),
            callApi({
              query: {
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.TenMinutes,
                bucketSizeInSeconds: 600,
              },
            }),
            callApi({
              query: {
                documentType: ApmDocumentType.TransactionMetric,
                rollupInterval: RollupInterval.SixtyMinutes,
                bucketSizeInSeconds: 3600,
              },
            }),
            callApi({
              query: {
                documentType: ApmDocumentType.TransactionEvent,
                rollupInterval: RollupInterval.None,
              },
            }),
          ]);
        });

        it('returns some transactions data', () => {
          expect(isEmpty(transactionsStatistics.currentPeriod)).to.be.equal(false);
        });

        it('returns some metrics data', () => {
          expect(isEmpty(metricsStatisticsOneMinute.currentPeriod)).to.be.equal(false);
          expect(isEmpty(metricsStatisticsTenMinute.currentPeriod)).to.be.equal(false);
          expect(isEmpty(metricsStatisticsSixtyMinute.currentPeriod)).to.be.equal(false);
        });

        it('has same latency mean value for metrics and transactions data', () => {
          const transactionsCurrentPeriod =
            transactionsStatistics.currentPeriod[transactionNames[0]];
          const metricsOneMinPeriod = metricsStatisticsOneMinute.currentPeriod[transactionNames[0]];
          const metricsTenMinPeriod = metricsStatisticsTenMinute.currentPeriod[transactionNames[0]];
          const metricsSixtyMinPeriod =
            metricsStatisticsSixtyMinute.currentPeriod[transactionNames[0]];
          const transactionsLatencyMean = meanBy(transactionsCurrentPeriod.latency, 'y');
          const metricsOneMinLatencyMean = meanBy(metricsOneMinPeriod.latency, 'y');
          const metricsTenMinLatencyMean = meanBy(metricsTenMinPeriod.latency, 'y');
          const metricsSixtyMinLatencyMean = meanBy(metricsSixtyMinPeriod.latency, 'y');
          [
            transactionsLatencyMean,
            metricsOneMinLatencyMean,
            metricsTenMinLatencyMean,
            metricsSixtyMinLatencyMean,
          ].forEach((value) => expect(value).to.be.equal(1000000));
        });

        it('has same error rate mean value for metrics and transactions data', () => {
          const transactionsCurrentPeriod =
            transactionsStatistics.currentPeriod[transactionNames[0]];
          const metricsOneMinPeriod = metricsStatisticsOneMinute.currentPeriod[transactionNames[0]];
          const metricsTenMinPeriod = metricsStatisticsTenMinute.currentPeriod[transactionNames[0]];
          const metricsSixtyMinPeriod =
            metricsStatisticsSixtyMinute.currentPeriod[transactionNames[0]];

          const transactionsErrorRateMean = meanBy(transactionsCurrentPeriod.errorRate, 'y');

          const metricsOneMinErrorRateMean = meanBy(metricsOneMinPeriod.errorRate, 'y');
          const metricsTenMinErrorRateMean = meanBy(metricsTenMinPeriod.errorRate, 'y');
          const metricsSixtyMinErrorRateMean = meanBy(metricsSixtyMinPeriod.errorRate, 'y');

          [
            transactionsErrorRateMean,
            metricsOneMinErrorRateMean,
            metricsTenMinErrorRateMean,
            metricsSixtyMinErrorRateMean,
          ].forEach((value) => expect(value).to.be.equal(GO_PROD_ERROR_RATE / 100));
        });

        it('has same throughput mean value for metrics and transactions data', () => {
          const transactionsCurrentPeriod =
            transactionsStatistics.currentPeriod[transactionNames[0]];
          const metricsOneMinPeriod = metricsStatisticsOneMinute.currentPeriod[transactionNames[0]];
          const metricsTenMinPeriod = metricsStatisticsTenMinute.currentPeriod[transactionNames[0]];
          const metricsSixtyMinPeriod =
            metricsStatisticsSixtyMinute.currentPeriod[transactionNames[0]];

          const transactionsThroughputMean = roundNumber(
            meanBy(transactionsCurrentPeriod.throughput, 'y')
          );
          const metricsOneMinThroughputMean = roundNumber(
            meanBy(metricsOneMinPeriod.throughput, 'y')
          );
          const metricsTenMinThroughputMean = roundNumber(
            meanBy(metricsTenMinPeriod.throughput, 'y')
          );
          const metricsSixtyMinThroughputMean = roundNumber(
            meanBy(metricsSixtyMinPeriod.throughput, 'y')
          );

          expect(metricsTenMinThroughputMean).to.be.equal(
            roundNumber(10 * (GO_PROD_RATE + GO_PROD_ERROR_RATE))
          );
          expect(metricsSixtyMinThroughputMean).to.be.equal(
            roundNumber(60 * (GO_PROD_RATE + GO_PROD_ERROR_RATE))
          );

          [transactionsThroughputMean, metricsOneMinThroughputMean].forEach((value) =>
            expect(value).to.be.equal(roundNumber(GO_PROD_RATE + GO_PROD_ERROR_RATE))
          );
        });

        it('has same impact value for metrics and transactions data', () => {
          const transactionsCurrentPeriod =
            transactionsStatistics.currentPeriod[transactionNames[0]];
          const metricsOneMinPeriod = metricsStatisticsOneMinute.currentPeriod[transactionNames[0]];
          const metricsTenMinPeriod = metricsStatisticsTenMinute.currentPeriod[transactionNames[0]];
          const metricsSixtyMinPeriod =
            metricsStatisticsSixtyMinute.currentPeriod[transactionNames[0]];

          [
            transactionsCurrentPeriod.impact,
            metricsOneMinPeriod.impact,
            metricsTenMinPeriod.impact,
            metricsSixtyMinPeriod.impact,
          ].forEach((value) => expect(value).to.be.equal(100));
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
            const lastCurrentPeriodDate = new Date(last(currentTimeseries)?.x ?? NaN).toISOString();
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
  });
}
