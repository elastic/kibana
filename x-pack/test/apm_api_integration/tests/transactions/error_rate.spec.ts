/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';
import expect from '@kbn/expect';
import { first, last } from 'lodash';
import moment from 'moment';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
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

  registry.when('Error rate when data is loaded', { config: 'basic', archives: [] }, () => {
    const config = {
      firstTransaction: {
        name: 'GET /apple 🍎 ',
        successRate: 75,
        failureRate: 25,
      },
      secondTransaction: {
        name: 'GET /banana 🍌',
        successRate: 50,
        failureRate: 50,
      },
    };
    before(async () => {
      const serviceGoProdInstance = apm
        .service({ name: 'opbeans-go', environment: 'production', agentName: 'go' })
        .instance('instance-a');

      const interval = '1m';

      const { firstTransaction, secondTransaction } = config;

      const documents = [firstTransaction, secondTransaction].map((transaction) => {
        return timerange(start, end)
          .interval(interval)
          .rate(transaction.successRate)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: transaction.name })
              .timestamp(timestamp)
              .duration(1000)
              .success()
          )
          .merge(
            timerange(start, end)
              .interval(interval)
              .rate(transaction.failureRate)
              .generator((timestamp) =>
                serviceGoProdInstance
                  .transaction({ transactionName: transaction.name })
                  .errors(
                    serviceGoProdInstance
                      .error({
                        message: 'Error 1',
                        type: transaction.name,
                        groupingName: 'Error test',
                      })
                      .timestamp(timestamp)
                  )
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
              )
          );
      });

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

        expect(errorRateResponse.currentPeriod.timeseries.length).to.be.greaterThan(0);
        expect(errorRateResponse.previousPeriod.timeseries).to.empty();

        const nonNullDataPoints = errorRateResponse.currentPeriod.timeseries.filter(
          ({ y }) => y !== null
        );

        expect(nonNullDataPoints.length).to.be.greaterThan(0);
      });

      it('has the correct start date', () => {
        expectSnapshot(
          new Date(first(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-01-01T00:00:00.000Z"`);
      });

      it('has the correct end date', () => {
        expectSnapshot(
          new Date(last(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-01-01T00:14:00.000Z"`);
      });

      it('has the correct number of buckets', () => {
        expectSnapshot(errorRateResponse.currentPeriod.timeseries.length).toMatchInline(`15`);
      });

      it('has the correct calculation for average', () => {
        expect(errorRateResponse.currentPeriod.average).to.eql(
          config.firstTransaction.failureRate / 100
        );
      });
    });

    describe('returns the transaction error rate with comparison data', () => {
      let errorRateResponse: ErrorRate;

      before(async () => {
        const response = await fetchErrorCharts({
          query: {
            transactionName: config.firstTransaction.name,
            start: moment(end).subtract(7, 'minutes').toISOString(),
            offset: '7m',
          },
        });

        errorRateResponse = response.body;
      });

      it('returns some data', () => {
        expect(errorRateResponse.currentPeriod.average).to.be.greaterThan(0);
        expect(errorRateResponse.previousPeriod.average).to.be.greaterThan(0);

        expect(errorRateResponse.currentPeriod.timeseries.length).to.be.greaterThan(0);
        expect(errorRateResponse.previousPeriod.timeseries.length).to.be.greaterThan(0);

        const currentPeriodNonNullDataPoints = errorRateResponse.currentPeriod.timeseries.filter(
          ({ y }) => y !== null
        );

        const previousPeriodNonNullDataPoints = errorRateResponse.previousPeriod.timeseries.filter(
          ({ y }) => y !== null
        );

        expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
        expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);
      });

      it('has the correct start date', () => {
        expectSnapshot(
          new Date(first(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-01-01T00:07:00.000Z"`);
        expectSnapshot(
          new Date(first(errorRateResponse.previousPeriod.timeseries)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-01-01T00:07:00.000Z"`);
      });

      it('has the correct end date', () => {
        expectSnapshot(
          new Date(last(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-01-01T00:14:00.000Z"`);
        expectSnapshot(
          new Date(last(errorRateResponse.previousPeriod.timeseries)?.x ?? NaN).toISOString()
        ).toMatchInline(`"2021-01-01T00:14:00.000Z"`);
      });

      it('has the correct number of buckets', () => {
        expectSnapshot(errorRateResponse.currentPeriod.timeseries.length).toMatchInline(`8`);
        expectSnapshot(errorRateResponse.previousPeriod.timeseries.length).toMatchInline(`8`);
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
  });
}
