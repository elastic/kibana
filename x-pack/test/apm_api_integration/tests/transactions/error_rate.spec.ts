/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';
import { format } from 'url';
import moment from 'moment';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/create_call_apm_api';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type ErrorRate =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  const archiveName = 'apm_8.0.0';

  // url parameters
  const { start, end } = archives_metadata[archiveName];
  const transactionType = 'request';

  registry.when('Error rate when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(
        format({
          pathname: '/internal/apm/services/opbeans-java/transactions/charts/error_rate',
          query: { start, end, transactionType, environment: 'ENVIRONMENT_ALL', kuery: '' },
        })
      );
      expect(response.status).to.be(200);

      const body = response.body as ErrorRate;
      expect(body).to.be.eql({
        currentPeriod: { timeseries: [], average: null },
        previousPeriod: { timeseries: [], average: null },
      });
    });

    it('handles the empty state with comparison data', async () => {
      const response = await supertest.get(
        format({
          pathname: '/internal/apm/services/opbeans-java/transactions/charts/error_rate',
          query: {
            transactionType,
            start: moment(end).subtract(15, 'minutes').toISOString(),
            end,
            offset: '15m',
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
          },
        })
      );
      expect(response.status).to.be(200);

      const body = response.body as ErrorRate;
      expect(body).to.be.eql({
        currentPeriod: { timeseries: [], average: null },
        previousPeriod: { timeseries: [], average: null },
      });
    });
  });

  registry.when(
    'Error rate when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('returns the transaction error rate', () => {
        let errorRateResponse: ErrorRate;

        before(async () => {
          const response = await supertest.get(
            format({
              pathname: '/internal/apm/services/opbeans-java/transactions/charts/error_rate',
              query: { start, end, transactionType, environment: 'ENVIRONMENT_ALL', kuery: '' },
            })
          );
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
          ).toMatchInline(`"2021-08-03T06:50:00.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(last(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T07:20:00.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(errorRateResponse.currentPeriod.timeseries.length).toMatchInline(`31`);
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(errorRateResponse.currentPeriod.average).toMatchInline(
            `0.0848214285714286`
          );
        });

        it('has the correct error rate', () => {
          expectSnapshot(errorRateResponse.currentPeriod.timeseries).toMatch();
        });
      });

      describe('returns the transaction error rate with comparison data', () => {
        let errorRateResponse: ErrorRate;

        before(async () => {
          const response = await supertest.get(
            format({
              pathname: '/internal/apm/services/opbeans-java/transactions/charts/error_rate',
              query: {
                transactionType,
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                offset: '15m',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            })
          );
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

          const previousPeriodNonNullDataPoints =
            errorRateResponse.previousPeriod.timeseries.filter(({ y }) => y !== null);

          expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
          expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(first(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T07:05:00.000Z"`);
          expectSnapshot(
            new Date(first(errorRateResponse.previousPeriod.timeseries)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T07:05:00.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(last(errorRateResponse.currentPeriod.timeseries)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T07:20:00.000Z"`);
          expectSnapshot(
            new Date(last(errorRateResponse.previousPeriod.timeseries)?.x ?? NaN).toISOString()
          ).toMatchInline(`"2021-08-03T07:20:00.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(errorRateResponse.currentPeriod.timeseries.length).toMatchInline(`16`);
          expectSnapshot(errorRateResponse.previousPeriod.timeseries.length).toMatchInline(`16`);
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(errorRateResponse.currentPeriod.average).toMatchInline(
            `0.0792079207920792`
          );
          expectSnapshot(errorRateResponse.previousPeriod.average).toMatchInline(
            `0.0894308943089431`
          );
        });

        it('has the correct error rate', () => {
          expectSnapshot(errorRateResponse.currentPeriod.timeseries).toMatch();
          expectSnapshot(errorRateResponse.previousPeriod.timeseries).toMatch();
        });

        it('matches x-axis on current period and previous period', () => {
          expect(errorRateResponse.currentPeriod.timeseries.map(({ x }) => x)).to.be.eql(
            errorRateResponse.previousPeriod.timeseries.map(({ x }) => x)
          );
        });
      });
    }
  );
}
