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
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type ErrorRateReturn = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/error_rate'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';

  // url parameters
  const { start, end } = archives_metadata[archiveName];
  const uiFilters = '{}';
  const transactionType = 'request';

  const url = format({
    pathname: '/api/apm/services/opbeans-java/transactions/charts/error_rate',
    query: { start, end, uiFilters, transactionType },
  });

  registry.when('Error rate when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await supertest.get(url);
      expect(response.status).to.be(200);

      expect(response.body.currentPeriod.noHits).to.be(true);

      expect(response.body.currentPeriod.transactionErrorRate.length).to.be(0);
      expect(response.body.currentPeriod.average).to.be(null);
    });
  });

  registry.when(
    'Error rate when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('returns the transaction error rate', () => {
        let errorRateResponse: ErrorRateReturn;

        before(async () => {
          const response = await supertest.get(url);
          errorRateResponse = response.body;
        });

        it('returns some data', () => {
          expect(errorRateResponse.currentPeriod.average).to.be.greaterThan(0);

          expect(errorRateResponse.currentPeriod.transactionErrorRate.length).to.be.greaterThan(0);

          const nonNullDataPoints = errorRateResponse.currentPeriod.transactionErrorRate.filter(
            ({ y }) => y !== null
          );

          expect(nonNullDataPoints.length).to.be.greaterThan(0);
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(
              first(errorRateResponse.currentPeriod.transactionErrorRate)?.x ?? NaN
            ).toISOString()
          ).toMatchInline(`"2020-12-08T13:57:30.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(
              last(errorRateResponse.currentPeriod.transactionErrorRate)?.x ?? NaN
            ).toISOString()
          ).toMatchInline(`"2020-12-08T14:27:30.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(errorRateResponse.currentPeriod.transactionErrorRate.length).toMatchInline(
            `61`
          );
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(errorRateResponse.currentPeriod.average).toMatchInline(`0.16`);
        });

        it('has the correct error rate', () => {
          expectSnapshot(errorRateResponse.currentPeriod.transactionErrorRate).toMatch();
        });
      });

      describe('returns the transaction error rate with comparison data', () => {
        let errorRateResponse: ErrorRateReturn;
        before(async () => {
          const response = await supertest.get(
            format({
              pathname: '/api/apm/services/opbeans-java/transactions/charts/error_rate',
              query: {
                uiFilters,
                transactionType,
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
              },
            })
          );
          errorRateResponse = response.body as ErrorRateReturn;
        });
        it('returns some data', () => {
          expect(errorRateResponse.currentPeriod.average).to.be.greaterThan(0);
          expect(errorRateResponse.previousPeriod.average).to.be.greaterThan(0);

          expect(errorRateResponse.currentPeriod.transactionErrorRate.length).to.be.greaterThan(0);
          expect(errorRateResponse.previousPeriod.transactionErrorRate.length).to.be.greaterThan(0);

          const currentPeriodNonNullDataPoints = errorRateResponse.currentPeriod.transactionErrorRate.filter(
            ({ y }) => y !== null
          );
          const previousPeriodNonNullDataPoints = errorRateResponse.currentPeriod.transactionErrorRate.filter(
            ({ y }) => y !== null
          );

          expect(currentPeriodNonNullDataPoints.length).to.be.greaterThan(0);
          expect(previousPeriodNonNullDataPoints.length).to.be.greaterThan(0);
        });

        it('has the correct start date', () => {
          expectSnapshot(
            new Date(
              first(errorRateResponse.currentPeriod.transactionErrorRate)?.x ?? NaN
            ).toISOString()
          ).toMatchInline(`"2020-12-08T14:12:50.000Z"`);
          expectSnapshot(
            new Date(
              first(errorRateResponse.previousPeriod.transactionErrorRate)?.x ?? NaN
            ).toISOString()
          ).toMatchInline(`"2020-12-08T14:12:50.000Z"`);
        });

        it('has the correct end date', () => {
          expectSnapshot(
            new Date(
              last(errorRateResponse.currentPeriod.transactionErrorRate)?.x ?? NaN
            ).toISOString()
          ).toMatchInline(`"2020-12-08T14:27:50.000Z"`);
          expectSnapshot(
            new Date(
              last(errorRateResponse.previousPeriod.transactionErrorRate)?.x ?? NaN
            ).toISOString()
          ).toMatchInline(`"2020-12-08T14:27:50.000Z"`);
        });

        it('has the correct number of buckets', () => {
          expectSnapshot(errorRateResponse.currentPeriod.transactionErrorRate.length).toMatchInline(
            `91`
          );
          expectSnapshot(
            errorRateResponse.previousPeriod.transactionErrorRate.length
          ).toMatchInline(`91`);
        });

        it('has the correct calculation for average', () => {
          expectSnapshot(errorRateResponse.currentPeriod.average).toMatchInline(
            `0.233333333333333`
          );
          expectSnapshot(errorRateResponse.previousPeriod.average).toMatchInline(
            `0.111111111111111`
          );
        });

        it('has the correct error rate', () => {
          expectSnapshot(errorRateResponse.currentPeriod.transactionErrorRate).toMatch();
          expectSnapshot(errorRateResponse.previousPeriod.transactionErrorRate).toMatch();
        });
      });
    }
  );
}
