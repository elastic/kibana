/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { first, last } from 'lodash';
import moment from 'moment';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type ErrorRate =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  // url parameters
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function fetchErrorCharts(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>['params']
    >
  ) {
    return await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/transactions/charts/error_rate`,
      params: {
        path: { serviceName: overrides?.path?.serviceName || 'opbeans-go' },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          bucketSizeInSeconds: 60,
          ...overrides?.query,
        },
      },
    });
  }

  registry.when('Error rate when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await fetchErrorCharts();
      expect(response.status).to.be(200);

      const body = response.body as ErrorRate;
      expect(body).to.be.eql({
        currentPeriod: { timeseries: [], average: null },
        previousPeriod: { timeseries: [], average: null },
      });
    });

    it('handles the empty state with comparison data', async () => {
      const response = await fetchErrorCharts({
        query: {
          start: moment(end).subtract(7, 'minutes').toISOString(),
          offset: '7m',
        },
      });
      expect(response.status).to.be(200);

      const body = response.body as ErrorRate;
      expect(body).to.be.eql({
        currentPeriod: { timeseries: [], average: null },
        previousPeriod: { timeseries: [], average: null },
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/177598
  registry.when('Error rate when data is loaded', { config: 'basic', archives: [] }, () => {
    const config = {
      firstTransaction: {
        name: 'GET /apple 🍎 ',
        successRate: 50,
        failureRate: 50,
      },
      secondTransaction: {
        name: 'GET /pear 🍎 ',
        successRate: 25,
        failureRate: 75,
      },
    };
    before(async () => {
      const serviceGoProdInstance = apm
        .service({ name: 'opbeans-go', environment: 'production', agentName: 'go' })
        .instance('instance-a');

      const { firstTransaction, secondTransaction } = config;

      const documents = [
        timerange(start, end)
          .ratePerMinute(firstTransaction.successRate)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: firstTransaction.name })
              .timestamp(timestamp)
              .duration(1000)
              .success()
          ),
        timerange(start, end)
          .ratePerMinute(firstTransaction.failureRate)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: firstTransaction.name })
              .duration(1000)
              .timestamp(timestamp)
              .failure()
          ),
        timerange(start, end)
          .ratePerMinute(secondTransaction.successRate)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: secondTransaction.name })
              .timestamp(timestamp)
              .duration(1000)
              .success()
          ),
        timerange(start, end)
          .ratePerMinute(secondTransaction.failureRate)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: secondTransaction.name })
              .duration(1000)
              .timestamp(timestamp)
              .failure()
          ),
      ];
      await synthtraceEsClient.index(documents);
    });

    after(() => synthtraceEsClient.clean());

    describe('returns the transaction error rate', () => {
      let errorRateResponse: ErrorRate;

      before(async () => {
        const response = await fetchErrorCharts({
          query: { transactionName: config.firstTransaction.name },
        });
        errorRateResponse = response.body;
      });

      it('returns some data', () => {
        expect(errorRateResponse.currentPeriod.average).to.be.greaterThan(0);
        expect(errorRateResponse.previousPeriod.average).to.be(null);

        expect(errorRateResponse.currentPeriod.timeseries).not.to.be.empty();
        expect(errorRateResponse.previousPeriod.timeseries).to.empty();

        const nonNullDataPoints = errorRateResponse.currentPeriod.timeseries.filter(
          ({ y }) => y !== null
        );

        expect(nonNullDataPoints).not.to.be.empty();
      });

      it('has the correct start date', () => {
        expect(
          new Date(first(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).to.eql('2021-01-01T00:00:00.000Z');
      });

      it('has the correct end date', () => {
        expect(
          new Date(last(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).to.eql('2021-01-01T00:14:00.000Z');
      });

      it('has the correct number of buckets', () => {
        expect(errorRateResponse.currentPeriod.timeseries.length).to.be.eql(15);
      });

      it('has the correct calculation for average', () => {
        expect(errorRateResponse.currentPeriod.average).to.eql(
          config.firstTransaction.failureRate / 100
        );
      });
    });

    describe('returns the transaction error rate with comparison data per transaction name', () => {
      let errorRateResponse: ErrorRate;

      before(async () => {
        const query = {
          transactionName: config.firstTransaction.name,
          start: moment(end).subtract(7, 'minutes').toISOString(),
          offset: '7m',
        };

        const response = await fetchErrorCharts({ query });

        errorRateResponse = response.body;
      });

      it('returns some data', () => {
        expect(errorRateResponse.currentPeriod.average).to.be.greaterThan(0);
        expect(errorRateResponse.previousPeriod.average).to.be.greaterThan(0);

        expect(errorRateResponse.currentPeriod.timeseries).not.to.be.empty();
        expect(errorRateResponse.previousPeriod.timeseries).not.to.be.empty();

        const currentPeriodNonNullDataPoints = errorRateResponse.currentPeriod.timeseries.filter(
          ({ y }) => y !== null
        );

        const previousPeriodNonNullDataPoints = errorRateResponse.previousPeriod.timeseries.filter(
          ({ y }) => y !== null
        );

        expect(currentPeriodNonNullDataPoints).not.to.be.empty();
        expect(previousPeriodNonNullDataPoints).not.to.be.empty();
      });

      it('has the correct start date', () => {
        expect(
          new Date(first(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).to.eql('2021-01-01T00:07:00.000Z');
        expect(
          new Date(first(errorRateResponse.previousPeriod.timeseries)?.x ?? NaN).toISOString()
        ).to.eql('2021-01-01T00:07:00.000Z');
      });

      it('has the correct end date', () => {
        expect(
          new Date(last(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).to.eql('2021-01-01T00:14:00.000Z');
        expect(
          new Date(last(errorRateResponse.previousPeriod.timeseries)?.x ?? NaN).toISOString()
        ).to.eql('2021-01-01T00:14:00.000Z');
      });

      it('has the correct number of buckets', () => {
        expect(errorRateResponse.currentPeriod.timeseries.length).to.eql(8);
        expect(errorRateResponse.previousPeriod.timeseries.length).to.eql(8);
      });

      it('has the correct calculation for average', () => {
        expect(errorRateResponse.currentPeriod.average).to.eql(
          config.firstTransaction.failureRate / 100
        );
        expect(errorRateResponse.previousPeriod.average).to.eql(
          config.firstTransaction.failureRate / 100
        );
      });

      it('matches x-axis on current period and previous period', () => {
        expect(errorRateResponse.currentPeriod.timeseries.map(({ x }) => x)).to.be.eql(
          errorRateResponse.previousPeriod.timeseries.map(({ x }) => x)
        );
      });
    });

    describe('returns the same error rate for tx metrics and service tx metrics ', () => {
      let txMetricsErrorRateResponse: ErrorRate;
      let serviceTxMetricsErrorRateResponse: ErrorRate;

      before(async () => {
        const [txMetricsResponse, serviceTxMetricsResponse] = await Promise.all([
          fetchErrorCharts(),
          fetchErrorCharts({
            query: { documentType: ApmDocumentType.ServiceTransactionMetric },
          }),
        ]);

        txMetricsErrorRateResponse = txMetricsResponse.body;
        serviceTxMetricsErrorRateResponse = serviceTxMetricsResponse.body;
      });

      describe('has the correct calculation for average', () => {
        const expectedFailureRate =
          (config.firstTransaction.failureRate + config.secondTransaction.failureRate) / 2 / 100;

        it('for tx metrics', () => {
          expect(txMetricsErrorRateResponse.currentPeriod.average).to.eql(expectedFailureRate);
        });

        it('for service tx metrics', () => {
          expect(serviceTxMetricsErrorRateResponse.currentPeriod.average).to.eql(
            expectedFailureRate
          );
        });
      });
    });
  });
}
