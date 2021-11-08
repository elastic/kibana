/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { first, last, sumBy } from 'lodash';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import {
  APIClientRequestParamsOf,
  APIReturnType,
} from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { RecursivePartial } from '../../../../plugins/apm/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type ErrorsDistribution =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
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
    'when data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('errors distribution', () => {
        const appleTransaction = {
          name: 'GET /apple 🍎 ',
          successRate: 75,
          failureRate: 25,
        };
        const bananaTransaction = {
          name: 'GET /banana 🍌',
          successRate: 50,
          failureRate: 50,
        };

        before(async () => {
          const serviceGoProdInstance = service(serviceName, 'production', 'go').instance(
            'instance-a'
          );

          const interval = '1m';

          const indices = [appleTransaction, bananaTransaction]
            .map((transaction, index) => {
              return [
                ...timerange(start, end)
                  .interval(interval)
                  .rate(transaction.successRate)
                  .flatMap((timestamp) =>
                    serviceGoProdInstance
                      .transaction(transaction.name)
                      .timestamp(timestamp)
                      .duration(1000)
                      .success()
                      .serialize()
                  ),
                ...timerange(start, end)
                  .interval(interval)
                  .rate(transaction.failureRate)
                  .flatMap((timestamp) =>
                    serviceGoProdInstance
                      .transaction(transaction.name)
                      .errors(
                        serviceGoProdInstance
                          .error(`Error ${index}`, transaction.name)
                          .timestamp(timestamp)
                      )
                      .duration(1000)
                      .timestamp(timestamp)
                      .failure()
                      .serialize()
                  ),
              ];
            })
            .flatMap((_) => _);

          await synthtraceEsClient.index(indices);
        });

        after(() => synthtraceEsClient.clean());

        describe('without comparison', () => {
          let errorsDistribution: ErrorsDistribution;
          before(async () => {
            const response = await callApi();
            errorsDistribution = response.body;
          });

          it('displays combined number of occurrences', () => {
            const countSum = sumBy(errorsDistribution.currentPeriod, 'y');
            const numberOfBuckets = 15;
            expect(countSum).to.equal(
              (appleTransaction.failureRate + bananaTransaction.failureRate) * numberOfBuckets
            );
          });
        });

        describe('displays occurrences for type "apple transaction" only', () => {
          let errorsDistribution: ErrorsDistribution;
          before(async () => {
            const response = await callApi({
              query: { kuery: `error.exception.type:"${appleTransaction.name}"` },
            });
            errorsDistribution = response.body;
          });
          it('displays combined number of occurrences', () => {
            const countSum = sumBy(errorsDistribution.currentPeriod, 'y');
            const numberOfBuckets = 15;
            expect(countSum).to.equal(appleTransaction.failureRate * numberOfBuckets);
          });
        });

        describe('with comparison', () => {
          describe('when data is returned', () => {
            let errorsDistribution: ErrorsDistribution;
            before(async () => {
              const fiveMinutes = 5 * 60 * 1000;
              const response = await callApi({
                query: {
                  start: new Date(end - fiveMinutes).toISOString(),
                  end: new Date(end).toISOString(),
                  comparisonStart: new Date(start).toISOString(),
                  comparisonEnd: new Date(start + fiveMinutes).toISOString(),
                },
              });
              errorsDistribution = response.body;
            });
            it('returns some data', () => {
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

          describe('when no data is returned', () => {
            let errorsDistribution: ErrorsDistribution;
            before(async () => {
              const response = await callApi({
                query: {
                  start: '2021-01-03T00:00:00.000Z',
                  end: '2021-01-03T00:15:00.000Z',
                  comparisonStart: '2021-01-02T00:00:00.000Z',
                  comparisonEnd: '2021-01-02T00:15:00.000Z',
                },
              });
              errorsDistribution = response.body;
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
      });
    }
  );
}
