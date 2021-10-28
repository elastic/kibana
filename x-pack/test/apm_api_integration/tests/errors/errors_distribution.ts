/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { first, last, sumBy } from 'lodash';
import moment from 'moment';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { RecursivePartial } from '../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

type ErrorsDistributionReturn =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const serviceName = 'synth-go';
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi(
    overrides?: RecursivePartial<
      APIClientRequestParamsOf<'GET /internal/apm/services/{serviceName}/errors/distribution'>['params']
    >
  ) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/errors/distribution',
      params: {
        path: {
          serviceName,
          ...overrides?.path,
        },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          ...overrides?.query,
        },
      },
    });
    return response;
  }

  registry.when('when data is not loaded', { config: 'basic', archives: [] }, () => {
    it('handles the empty state', async () => {
      const response = await callApi();
      expect(response.status).to.be(200);
      expect(response.body.currentPeriod.length).to.be(0);
      expect(response.body.previousPeriod.length).to.be(0);
    });
  });

  registry.when(
    'when data is not loaded',
    { config: 'basic', archives: ['apm_8.0.0_empty'] },
    () => {
      describe('errors distribution', () => {
        const PROD_LIST_RATE = 75;
        const PROD_LIST_ERROR_RATE = 25;
        const PROD_ID_RATE = 50;
        const PROD_ID_ERROR_RATE = 50;
        const ERROR_NAME_1 = 'Error test 1';
        const ERROR_NAME_2 = 'Error test 2';
        before(async () => {
          const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
            'instance-a'
          );

          const transactionNameProductList = 'GET /api/product/list';
          const transactionNameProductId = 'GET /api/product/:id';

          await synthtraceEsClient.index([
            ...timerange(start, end)
              .interval('1m')
              .rate(PROD_LIST_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductList)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1m')
              .rate(PROD_LIST_ERROR_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductList)
                  .errors(serviceGoProdInstance.error(ERROR_NAME_1, 'foo').timestamp(timestamp))
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1m')
              .rate(PROD_ID_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductId)
                  .timestamp(timestamp)
                  .duration(1000)
                  .success()
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1m')
              .rate(PROD_ID_ERROR_RATE)
              .flatMap((timestamp) =>
                serviceGoProdInstance
                  .transaction(transactionNameProductId)
                  .errors(serviceGoProdInstance.error(ERROR_NAME_2, 'bar').timestamp(timestamp))
                  .duration(1000)
                  .timestamp(timestamp)
                  .failure()
                  .serialize()
              ),
          ]);
        });

        after(() => synthtraceEsClient.clean());

        describe('without comparison', () => {
          let errorsDistribution: ErrorsDistributionReturn;
          before(async () => {
            const response = await callApi();
            errorsDistribution = response.body;
          });

          it('has correct number of occurences', () => {
            const countSum = sumBy(errorsDistribution.currentPeriod, 'y');
            const numberOfBucket = 15;
            expect(countSum).to.equal((PROD_ID_ERROR_RATE + PROD_LIST_ERROR_RATE) * numberOfBucket);
          });
        });

        describe('group id Error test 2', () => {
          let errorsDistribution: ErrorsDistributionReturn;
          before(async () => {
            const response = await callApi({
              query: { kuery: 'error.exception.type:"foo"' },
            });
            errorsDistribution = response.body;
          });
          it('has correct number of occurences', () => {
            const countSum = sumBy(errorsDistribution.currentPeriod, 'y');
            const numberOfBucket = 15;
            expect(countSum).to.equal(PROD_LIST_ERROR_RATE * numberOfBucket);
          });
        });

        describe('with comparison', () => {
          let errorsDistribution: ErrorsDistributionReturn;
          before(async () => {
            const response = await callApi({
              query: {
                start: moment(end).subtract(7, 'minutes').toISOString(),
                end: new Date(end).toISOString(),
                comparisonStart: new Date(start).toISOString(),
                comparisonEnd: moment(start).add(7, 'minutes').toISOString(),
              },
            });
            errorsDistribution = response.body;
          });
          it('returns some data', () => {
            expect(Object.keys(errorsDistribution.currentPeriod).length).to.be.greaterThan(0);
            expect(Object.keys(errorsDistribution.previousPeriod).length).to.be.greaterThan(0);

            const hasCurrentPeriodData = errorsDistribution.currentPeriod.some(({ y }) =>
              isFiniteNumber(y)
            );

            const hasPreviousPeriodData = errorsDistribution.previousPeriod.some(({ y }) =>
              isFiniteNumber(y)
            );

            expect(hasCurrentPeriodData).to.equal(true);
            expect(hasPreviousPeriodData).to.equal(true);
          });

          it('has same start time for both periods', () => {
            expect(first(errorsDistribution.currentPeriod)?.x).to.equal(
              first(errorsDistribution.previousPeriod)?.x
            );
          });

          it('has same end time for both periods', () => {
            expect(last(errorsDistribution.currentPeriod)?.x).to.equal(
              last(errorsDistribution.previousPeriod)?.x
            );
          });

          it('returns same number of buckets for both periods', () => {
            expect(errorsDistribution.currentPeriod.length).to.equal(
              errorsDistribution.previousPeriod.length
            );
          });
        });
      });
    }
  );
}
