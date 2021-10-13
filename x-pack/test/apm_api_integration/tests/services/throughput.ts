/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { service, timerange } from '@elastic/apm-generator';
import expect from '@kbn/expect';
import { first, last, meanBy } from 'lodash';
import moment from 'moment';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

type ThroughputReturn = APIReturnType<'GET /internal/apm/services/{serviceName}/throughput'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const traceData = getService('traceData');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

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
      comparisonStart?: string;
      comparisonEnd?: string;
    };
  }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
      params: {
        path: {
          serviceName: 'synth-go',
          ...overrides?.path,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  registry.when('Throughput when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.currentPeriod.length).to.be(0);
      expect(response.body.previousPeriod.length).to.be(0);
    });
  });

  registry.when('data is loaded', { config: 'basic', archives: ['apm_8.0.0_empty'] }, () => {
    describe('Throughput chart api', () => {
      const GO_PROD_RATE = 50;
      const GO_DEV_RATE = 5;
      const JAVA_PROD_RATE = 45;

      before(async () => {
        const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
          'instance-a'
        );
        const serviceGoDevInstance = service(serviceName, 'development', 'go').instance(
          'instance-b'
        );

        const serviceJavaInstance = service('synth-java', 'development', 'java').instance(
          'instance-c'
        );

        await traceData.index([
          ...timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .flatMap((timestamp) =>
              serviceGoProdInstance
                .transaction('GET /api/product/list')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
          ...timerange(start, end)
            .interval('1m')
            .rate(GO_DEV_RATE)
            .flatMap((timestamp) =>
              serviceGoDevInstance
                .transaction('GET /api/product/:id')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
          ...timerange(start, end)
            .interval('1m')
            .rate(JAVA_PROD_RATE)
            .flatMap((timestamp) =>
              serviceJavaInstance
                .transaction('POST /api/product/buy')
                .duration(1000)
                .timestamp(timestamp)
                .serialize()
            ),
        ]);
      });

      after(() => traceData.clean());

      describe('compare transactions and metrics based throughput', () => {
        let throughputMetrics: ThroughputReturn;
        let throughputTransactions: ThroughputReturn;

        before(async () => {
          const [throughputMetricsResponse, throughputTransactionsResponse] = await Promise.all([
            callApi({ query: { kuery: 'processor.event : "metric"' } }),
            callApi({ query: { kuery: 'processor.event : "transaction"' } }),
          ]);
          throughputMetrics = throughputMetricsResponse.body;
          throughputTransactions = throughputTransactionsResponse.body;
        });

        it('returns some transactions data', () => {
          expect(throughputTransactions.currentPeriod.length).to.be.greaterThan(0);
          const hasData = throughputTransactions.currentPeriod.some(({ y }) => isFiniteNumber(y));
          expect(hasData).to.equal(true);
        });

        it('returns some metrics data', () => {
          expect(throughputMetrics.currentPeriod.length).to.be.greaterThan(0);
          const hasData = throughputMetrics.currentPeriod.some(({ y }) => isFiniteNumber(y));
          expect(hasData).to.equal(true);
        });

        it('has same mean value for metrics and transactions data', () => {
          const transactionsMean = meanBy(throughputTransactions.currentPeriod, 'y');
          const metricsMean = meanBy(throughputMetrics.currentPeriod, 'y');
          [transactionsMean, metricsMean].forEach((value) =>
            expect(roundNumber(value)).to.be.equal(roundNumber(GO_PROD_RATE + GO_DEV_RATE))
          );
        });

        it('has a bucket size of 10 seconds for transactions data', () => {
          const firstTimerange = throughputTransactions.currentPeriod[0].x;
          const secondTimerange = throughputTransactions.currentPeriod[1].x;
          const timeIntervalAsSeconds = (secondTimerange - firstTimerange) / 1000;
          expect(timeIntervalAsSeconds).to.equal(10);
        });

        it('has a bucket size of 1 minute for metrics data', () => {
          const firstTimerange = throughputMetrics.currentPeriod[0].x;
          const secondTimerange = throughputMetrics.currentPeriod[1].x;
          const timeIntervalAsMinutes = (secondTimerange - firstTimerange) / 1000 / 60;
          expect(timeIntervalAsMinutes).to.equal(1);
        });
      });

      describe('switch environment', () => {
        let throughput: ThroughputReturn;

        before(async () => {
          const throughputResponse = await callApi({ query: { environment: 'production' } });
          throughput = throughputResponse.body;
        });

        it('returns some data', () => {
          expect(throughput.currentPeriod.length).to.be.greaterThan(0);
          const hasData = throughput.currentPeriod.some(({ y }) => isFiniteNumber(y));
          expect(hasData).to.equal(true);
        });

        it('returns throughput related to production environment', () => {
          const throughputMean = meanBy(throughput.currentPeriod, 'y');
          expect(roundNumber(throughputMean)).to.be.equal(roundNumber(GO_PROD_RATE));
        });
      });

      describe('when synth-java is selected', () => {
        let throughput: ThroughputReturn;

        before(async () => {
          const throughputResponse = await callApi({ path: { serviceName: 'synth-java' } });
          throughput = throughputResponse.body;
        });

        it('returns some data', () => {
          expect(throughput.currentPeriod.length).to.be.greaterThan(0);
          const hasData = throughput.currentPeriod.some(({ y }) => isFiniteNumber(y));
          expect(hasData).to.equal(true);
        });

        it('returns throughput related to java agent', () => {
          const throughputMean = meanBy(throughput.currentPeriod, 'y');
          expect(roundNumber(throughputMean)).to.be.equal(roundNumber(JAVA_PROD_RATE));
        });
      });

      describe('time comparisons', () => {
        let throughputResponse: ThroughputReturn;

        before(async () => {
          const response = await callApi({
            query: {
              start: moment(end).subtract(7, 'minutes').toISOString(),
              end: new Date(end).toISOString(),
              comparisonStart: new Date(start).toISOString(),
              comparisonEnd: moment(start).add(7, 'minutes').toISOString(),
            },
          });
          throughputResponse = response.body;
        });

        it('returns some data', () => {
          expect(throughputResponse.currentPeriod.length).to.be.greaterThan(0);
          expect(throughputResponse.previousPeriod.length).to.be.greaterThan(0);

          const hasCurrentPeriodData = throughputResponse.currentPeriod.some(({ y }) =>
            isFiniteNumber(y)
          );
          const hasPreivousPeriodData = throughputResponse.previousPeriod.some(({ y }) =>
            isFiniteNumber(y)
          );

          expect(hasCurrentPeriodData).to.equal(true);
          expect(hasPreivousPeriodData).to.equal(true);
        });

        it('has same start time for both periods', () => {
          expect(
            new Date(first(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()
          ).to.equal(new Date(first(throughputResponse.previousPeriod)?.x ?? NaN).toISOString());
        });

        it('has same end time for both periods', () => {
          expect(new Date(last(throughputResponse.currentPeriod)?.x ?? NaN).toISOString()).to.equal(
            new Date(last(throughputResponse.previousPeriod)?.x ?? NaN).toISOString()
          );
        });

        it('returns same number of buckets for both periods', () => {
          expect(throughputResponse.currentPeriod.length).to.be(
            throughputResponse.previousPeriod.length
          );
        });

        it('has same mean value for both periods', () => {
          const currentPeriodMean = meanBy(
            throughputResponse.currentPeriod.filter((item) => isFiniteNumber(item.y) && item.y > 0),
            'y'
          );
          const previousPeriodMean = meanBy(
            throughputResponse.previousPeriod.filter(
              (item) => isFiniteNumber(item.y) && item.y > 0
            ),
            'y'
          );
          const currentPeriod = throughputResponse.currentPeriod;
          const bucketSize = currentPeriod[1].x - currentPeriod[0].x;
          const durationAsMinutes = bucketSize / 1000 / 60;
          [currentPeriodMean, previousPeriodMean].every((value) =>
            expect(roundNumber(value)).to.be.equal(
              roundNumber((GO_PROD_RATE + GO_DEV_RATE) / durationAsMinutes)
            )
          );
        });
      });
    });
  });
}
