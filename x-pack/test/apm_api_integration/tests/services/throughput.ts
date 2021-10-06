/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last, mean, meanBy } from 'lodash';
import moment from 'moment';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type ThroughputReturn = APIReturnType<'GET /api/apm/services/{serviceName}/throughput'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

  const archiveName = 'apm_synthetic_8.0.0';
  const metadata = archives_metadata[archiveName];

  registry.when('Throughput when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await apmApiSupertest({
        endpoint: 'GET /api/apm/services/{serviceName}/throughput',
        params: {
          path: {
            serviceName: 'opbeans-go',
          },
          query: {
            start: metadata.start,
            end: metadata.end,
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
          },
        },
      });

      expect(response.status).to.be(200);
      expect(response.body.currentPeriod.length).to.be(0);
      expect(response.body.previousPeriod.length).to.be(0);
    });
  });

  async function fetchThroughput(processorEvent: 'metric' | 'transaction') {
    const throughputResponse = await apmApiSupertest({
      endpoint: 'GET /api/apm/services/{serviceName}/throughput',
      params: {
        path: { serviceName: 'opbeans-go' },
        query: {
          start: metadata.start,
          end: metadata.end,
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          kuery: `processor.event : "${processorEvent}"`,
        },
      },
    });
    return throughputResponse.body;
  }

  registry.when(
    'Throughput when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('without comparisons', () => {
        let throughputMetrics: ThroughputReturn;
        let throughputTransactions: ThroughputReturn;

        before(async () => {
          [throughputMetrics, throughputTransactions] = await Promise.all([
            fetchThroughput('metric'),
            fetchThroughput('transaction'),
          ]);
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
          expect(transactionsMean).to.equal(metricsMean);
          expectSnapshot(transactionsMean).toMatchInline(`100`);
          expectSnapshot(metricsMean).toMatchInline(`100`);
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

      describe('with comparisons', () => {
        let throughputResponse: ThroughputReturn;

        before(async () => {
          const response = await apmApiSupertest({
            endpoint: 'GET /api/apm/services/{serviceName}/throughput',
            params: {
              path: {
                serviceName: 'opbeans-go',
              },
              query: {
                transactionType: 'request',
                start: moment(metadata.end).subtract(15, 'minutes').toISOString(),
                end: metadata.end,
                comparisonStart: metadata.start,
                comparisonEnd: moment(metadata.start).add(15, 'minutes').toISOString(),
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });

          throughputResponse = response.body;
        });

        it('returns some data', () => {
          expect(throughputResponse.currentPeriod.length).to.be.greaterThan(0);
          expect(throughputResponse.previousPeriod.length).to.be.greaterThan(0);

          const currentPeriodNonNullDataPoints = throughputResponse.currentPeriod.filter(({ y }) =>
            isFiniteNumber(y)
          );
          const previousPeriodNonNullDataPoints = throughputResponse.previousPeriod.filter(
            ({ y }) => isFiniteNumber(y)
          );

          expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
          expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);
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

        it('has same mea value for both periods', () => {
          const currentPeriodAvg = mean(throughputResponse.currentPeriod.map((d) => d.y));
          const previousPeriodAvg = mean(throughputResponse.previousPeriod.map((d) => d.y));
          expect(currentPeriodAvg).to.equal(previousPeriodAvg);
        });
      });
    }
  );
}
