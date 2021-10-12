/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, isEmpty, last, meanBy } from 'lodash';
import moment from 'moment';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type TransactionsGroupsDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_synthetic_8.0.0';
  const { start, end } = archives[archiveName];
  const transactionNames = ['100rpm (75% success) failed 1000ms'];

  registry.when(
    'Transaction groups detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint:
            'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
          params: {
            path: {
              serviceName: 'opbeans-go',
            },
            query: {
              start,
              end,
              numBuckets: 20,
              latencyAggregationType: 'avg' as LatencyAggregationType,
              transactionType: 'request',
              transactionNames: JSON.stringify(transactionNames),
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
      });
    }
  );

  async function fetchTransactionsDetailedStats({
    processorEvent,
    withComparison = false,
  }: {
    processorEvent: 'metric' | 'transaction';
    withComparison?: boolean;
  }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
      params: {
        path: {
          serviceName: 'opbeans-go',
        },
        query: {
          start,
          end,
          numBuckets: 20,
          transactionType: 'request',
          latencyAggregationType: 'avg' as LatencyAggregationType,
          transactionNames: JSON.stringify(transactionNames),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...(withComparison
            ? {
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
              }
            : {}),
        },
      },
    });
    expect(response.status).to.be(200);
    return response.body;
  }

  registry.when('When data is loaded', { config: 'basic', archives: [archiveName] }, () => {
    describe('without comparisons', () => {
      let transactionsStatistics: TransactionsGroupsDetailedStatistics;
      let metricsStatistics: TransactionsGroupsDetailedStatistics;
      before(async () => {
        [metricsStatistics, transactionsStatistics] = await Promise.all([
          fetchTransactionsDetailedStats({ processorEvent: 'metric' }),
          fetchTransactionsDetailedStats({ processorEvent: 'transaction' }),
        ]);
      });

      it('returns some transactions data', () => {
        expect(isEmpty(transactionsStatistics.currentPeriod)).to.be.equal(false);
      });

      it('returns some metrics data', () => {
        expect(isEmpty(metricsStatistics.currentPeriod)).to.be.equal(false);
      });

      it('has same latency mean value for metrics and transactions data', () => {
        const transactionsCurrentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
        const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];

        const transactionsLatencyMean = meanBy(transactionsCurrentPeriod.latency, 'y');
        const metricsLatencyMean = meanBy(metricsCurrentPeriod.latency, 'y');
        expect(transactionsLatencyMean).to.equal(metricsLatencyMean);
        expectSnapshot(transactionsLatencyMean).toMatchInline(`1000000`);
        expectSnapshot(metricsLatencyMean).toMatchInline(`1000000`);
      });

      it('has same error rate mean value for metrics and transactions data', () => {
        const transactionsCurrentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
        const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];

        const transactionsErrorRateMean = meanBy(transactionsCurrentPeriod.errorRate, 'y');
        const metricsErrorRateMean = meanBy(metricsCurrentPeriod.errorRate, 'y');
        expect(transactionsErrorRateMean).to.equal(metricsErrorRateMean);
        expectSnapshot(transactionsErrorRateMean).toMatchInline(`0.25`);
        expectSnapshot(metricsErrorRateMean).toMatchInline(`0.25`);
      });

      it('has same throughput mean value for metrics and transactions data', () => {
        const transactionsCurrentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
        const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];

        const transactionsThroughputMean = meanBy(transactionsCurrentPeriod.throughput, 'y');
        const metricsThroughputMean = meanBy(metricsCurrentPeriod.throughput, 'y');
        expect(transactionsThroughputMean).to.equal(metricsThroughputMean);
        expectSnapshot(transactionsThroughputMean).toMatchInline(`100`);
        expectSnapshot(metricsThroughputMean).toMatchInline(`100`);
      });

      it('has same impact value for metrics and transactions data', () => {
        const transactionsCurrentPeriod = transactionsStatistics.currentPeriod[transactionNames[0]];
        const metricsCurrentPeriod = metricsStatistics.currentPeriod[transactionNames[0]];

        const transactionsImpact = transactionsCurrentPeriod.impact;
        const metricsImpact = metricsCurrentPeriod.impact;
        expect(transactionsImpact).to.equal(metricsImpact);
        expectSnapshot(transactionsImpact).toMatchInline(`100`);
        expectSnapshot(metricsImpact).toMatchInline(`100`);
      });
    });

    describe('with comparisons', () => {
      let transactionsStatistics: TransactionsGroupsDetailedStatistics;
      before(async () => {
        transactionsStatistics = await fetchTransactionsDetailedStats({
          processorEvent: 'transaction',
          withComparison: true,
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
          const firstCurrentPeriodDate = new Date(first(currentTimeseries)?.x ?? NaN).toISOString();
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
}
